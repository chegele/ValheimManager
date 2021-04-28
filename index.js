
require('./src/types/typedef');

const path = require('path');
const fs = require('fs-extra');
const Logger = require('chegs-simple-logger');
const AutoUpdate = require('auto-git-update');

const Backups = require('./src/backups');
const Discord = require('./src/discord');
const Installer = require('./src/installer');
const Launcher = require('./src/launcher');
const System = require('./src/system');
const ValFiles = require('./src/valheimFiles');
const defConfig = require('./src/types/defaultConfig');

const autoGitUpdateConfig = {
    repository: 'https://github.com/chegele/ValheimManager',
    tempLocation: './tmp/',
    exitOnComplete: true
}

module.exports = class ValheimManager {

    /** @param {Configuration} config - The configuration for the manager */
    constructor(config) {

        // Validate the configuration file
        const configValidation = validateConfiguration(config);
        if (configValidation !== 'ok') throw new Error(configValidation);

        // Check operating system and add to the config
        const os = process.platform; 
        if (os !== 'win32' && os !== 'linux') {
            let error = `This operating system, ${os}, is not supported!\n`;
            error += `You can set manager.operatingSystem to either win32 or linux to ignore this warning.`;
            if (!config.manager.operatingSystem) throw new Error(error);
        } else {
            config.manager.operatingSystem = os;
        }

        // Create instances of all tools and dependencies
        this.config = config;
        this.validateConfig = validateConfiguration;
        this.logger = new Logger(config.logging);
        this.autoManagerUpdate = new AutoUpdate(autoGitUpdateConfig);
        this.backups = new Backups(this);
        this.installer = new Installer(this);
        this.launcher = new Launcher(this);
        this.system = new System(this);
        this.valFiles = new ValFiles(this);
        this.discord = new Discord(this);

        // Prepare the commands
        /**@type {Map<String, Command>} */
        this.commands = new Map();
        const commandsPath = path.resolve(__dirname, './src/commands/');
        for (const file of fs.readdirSync(commandsPath)) {
            if (file == 'command.js' || !file.endsWith('.js') || file.startsWith('old_')) continue;
            const commandPath = path.join(commandsPath, file);
            const command = new (require(commandPath))(this);
            this.commands.set(command.name, command);
        }

        // Monitor for SIGINT and stop server
        const manager = this;
        process.on('SIGINT', async function() {
            manager.logger.general('Signal interrupt detected');
            await manager.launcher.stopValheim();
            process.exit();
        });
    }

    
    /**
     * Processes a user executed command
     * @param {String} commandString - The command including arguments
     * @param {Function<String>} update - A callback function for providing updates in case of long execution time 
     * @returns {String} a user ready result from the command execution
     */
    async execute(commandString, update) {

        // Validate the command string and break it down to its components
        if (!commandString || typeof(commandString) != 'string') throw new Error('Execute expects a command string as the first argument.');
        const args = commandString.split(' ');
        const commandName = args.shift();

        // If this is a request for the command list, display all available commands
        if (commandName && commandName.toLowerCase() == 'command-list') {
            let list = '\n== COMMAND NAME == == DESCRIPTION ==';
            for (const command of this.commands.values()) list += `\n ${command.name} - ${command.description}`;
            return list;
        }

        // Identify the command being called 
        const command = this.commands.get(commandName);
        if (!command) return `${commandName} is not a valid command. Try command-list.`;

        // Validate and execute the command
        try {
            if (update && command.acknowledgment) update(command.acknowledgment);
            const validationError = await command.validate(args);
            if (validationError) return validationError;
            return await command.execute(args);
        } catch (err) {
            this.logger.error(`Error executing command - ${commandString}. \n${err.stack}`);
            return 'There was an error executing this command';
        }
    }
    
}

/**
 * Synchronous / thread blocking validation of the config which can be used in the modules constructor.
 * @param {Configuration} config - The user provided configuration to be validated.
 * @returns {String} - A fully detailed error message to help an average user troubleshoot, or "ok".
 */
function validateConfiguration(config) {
    const errors = [];

    // Validate the main components are present
    if (!config.manager) errors.push('The manager portion of this config is missing. Maybe this is not a config file?');
    if (!config.launcher) errors.push('The launcher portion of this config is missing.');
    if (!config.logging) errors.push('The logging portion of this config is missing.');
    if (!config.discord) errors.push('The discord portion of this config is missing.');
    if (errors.length > 0) return errors.join('\n');

    // Validate the existence and types of required properties
    const ignoreProperties = ['operatingSystem'];
    for (const component of ['manager', 'launcher', 'discord', 'logging']) {
        for (const [key, value] of Object.entries(defConfig[component])) {
            if (ignoreProperties.includes(key)) continue;
            if (config[component][key] == undefined) {
                errors.push(`The ${component}.${key} property is required but does not seem to exist.`);
            } else {
                const propType = typeof(config[component][key]);
                const expectedType = typeof(value);
                if (propType != expectedType) {
                    errors.push(`The ${component}.${key} property is expected to be a ${expectedType}. It is currently ${config[component][key]}(${propType}).`);
                }
            }
        }
    }

    // Validate the parent directory is accessible. Create the child directory if needed. 
    const validatePaths = [config.manager.configLocation, config.manager.serverLocation];
    if (config.logging.writeLog) validatePaths.push(config.logging.filePath);
    for (const location of validatePaths) {
        const fullPath = path.resolve(location);
        const parentPath = path.dirname(fullPath);
        if (!fs.existsSync(parentPath)) {
            errors.push(`The path ${parentPath} is not accessible.`);
            continue;
        } 
        if (!fs.existsSync(fullPath)) {
            const creationMethod = fullPath.includes('.') ? fs.createFileSync : fs.mkdirSync;
            creationMethod(fullPath);
        } 
    }

    // Validate the specifics of some property values
    if (config.manager.backupFrequency < 0) errors.push('The backup frequency should be greater than 0.');
    if (config.manager.backupRetention < 0) errors.push('The backup retention should be greater than 0.');
    if (config.launcher.port < 1024 || config.launcher.port > 65535) errors.push('The port should be between 1024 and 65535.');
    if (config.logging.writeLog) {
        if (!config.logging.fileSize.match(/[BKMG]$/)) errors.push('The logging file size should end with B, K, M, or G. This letters represent the byte measurement options.');
        if (config.logging.fileAge < 0) errors.push('The logging file age should be more than 0 days.');
        if (config.logging.fileCount < 0) errors.push('The logging file max count should be more than 0.');
    }
    if (config.discord.token != '') {
        if (config.discord.token.length < 20) errors.push('The discord token should be longer.');
        if (config.discord.serverId.length != 18) errors.push('The discord server id should be 18 characters long.');
        if (config.discord.adminRoleId.length != 18) errors.push('The discord admin role id should be 18 characters long.');
        if (config.discord.serverLogChannel.length != 18) errors.push('The discord server log channel id should be 18 characters long.');
        if (config.discord.commandLogChannel.length != 18) errors.push('The discord command log channel id should be 18 characters long.');
    }

    if (errors.length > 0) return errors.join('\n');
    return 'ok';
}