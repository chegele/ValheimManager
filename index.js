
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
        this.logger = new Logger(config.logging);
        this.autoManagerUpdate = new AutoUpdate(autoGitUpdateConfig);
        this.backups = new Backups(this);
        this.discord = new Discord(this);
        this.installer = new Installer(this);
        this.launcher = new Launcher(this);
        this.system = new System(this);
        this.valFiles = new ValFiles(this);

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
    if (!config.manager) errors.push('The launcher portion of this config is missing. Maybe this is not a config file?');
    if (!config.manager) errors.push('The logging portion of this config is missing. Maybe this is not a config file?');
    if (errors.length > 0) return errors.join('\n');

    // Validate the existence and types of required properties
    const ignoreProperties = ['operatingSystem'];
    for (const component of ['manager', 'launcher', 'logging']) {
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

    // Validate file paths 
    const validatePaths = [config.manager.configLocation, config.manager.serverLocation];
    if (config.logging.writeLog) validatePaths.push(config.logging.filePath);
    for (const location of validatePaths) {
        const fullPath = path.resolve(location);
        if (!fs.existsSync(fullPath)) errors.push(`The path ${fullPath} is not accessible.`);
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

    if (errors.length > 0) return errors.join('\n');
    return 'ok';
}