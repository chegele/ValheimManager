
// Import the dependencies
const ValheimManager = require('../index');
const defaultConfig = require('./types/defaultConfig');
const path = require('path');
const fs = require('fs-extra');
const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const textTitle = `
 _   _       _ _          _            ___  ___                                  
| | | |     | | |        (_)           |  \\/  |                                  
| | | | __ _| | |__   ___ _ _ __ ___   | .  . | __ _ _ __   __ _  __ _  ___ _ __ 
| | | |/ _\` | | '_ \\ / _ \\ | '_ \` _ \\  | |\\/| |/ _\` | '_ \\ / _\` |/ _\` |/ _ \\ '__|
\\ \\_/ / (_| | | | | |  __/ | | | | | | | |  | | (_| | | | | (_| | (_| |  __/ |   
 \\___/ \\__,_|_|_| |_|\\___|_|_| |_| |_| \\_|  |_/\\__,_|_| |_|\\__,_|\\__, |\\___|_|   
                                                                  __/ |          
                                                                 |___/   
`;
console.log(textTitle);

// Create a logger to be used in case of error, before the script closes
let logger;

// Get the config path argument. If nothing is provided, check for the default name in executing directory. 
const defaultConfigPath = path.resolve('./vmConfig.json');
let pathArg = process.argv.length > 2 ? process.argv[3] : null;
if (!pathArg && fs.existsSync(defaultConfigPath)) pathArg = defaultConfigPath;


/** Asynchronous container for running the script **/
async function execute() {
    
    // Ask the user to provide or create a config file
    if (!pathArg) {

        let question = 'Unable to identify the configuration file. What would you like to do?';
        question += `\n  - (1) Provide the path/name to the configuration file`;
        question += `\n  - (2) Generate a new configuration file`;
        question += `\n  - (3) Cancel execution of the Valheim Manager`;

        const response = await prompt(question, answer => {
            if (!['1', '2', '3'].includes(answer)) return 'You must select an option between 1 and 3.';
        });

        if (response == '3') process.exit();
        if (response == '2') pathArg = await setupConfig();
        if (response == '1') pathArg = await prompt('What is the path to the configuration file?', answer => {
            if (!fs.existsSync(path.resolve(answer))) return 'This file is not accessible or does not exist.';
        });
    }

    // Parse the configuration file. Configuration properties will be validated by the manager
    const configPath = path.resolve(pathArg);
    if (!fs.existsSync(configPath)) throw new Error('The provided configuration does not exist.\nPath: ' + configPath);
    const config = await fs.readJSON(configPath).catch(err => {
        throw new Error(`Failed to parse the configuration file. Maybe you provided the wrong path?\nPath: ${configPath}\n${err.stack}`);
    });

    // Setup the valheim manager.
    const manager = new ValheimManager(config);
    logger = manager.logger;

    // Check for a new version
    manager.logger.general(`Checking for updates...`);
    const remote = await manager.system.readRemoteVersion();
    const local = await manager.system.readLocalVersion();
    if (local != remote) {
        manager.logger.general(`= AN UPDATE IS AVAILABLE FOR THE VALHEIM MANAGER =`);
        manager.logger.general(`= INSTALLED VERSION: ${local}`);
        manager.logger.general(`= AVAILABLE VERSION: ${remote}`);
    } else {
        manager.logger.general(`Valheim Manager is up to date.`);
    }

    // If configured, attempt to open ports
    if (config.manager.autoOpenPorts) await manager.system.autoOpenServerPorts().catch(err => {
        console.log(`Your router may not have upnp services enabled. Try again after enabling this feature on your router or manually open the ports.`);
        process.exit();
    });

    // Install the the steam CLI
    const steamInstalled = await manager.installer.validateSteam();
    if (!steamInstalled) {
        if (!await manager.installer.installSteam()) process.exit();
        await manager.system.wait(3);
    }

    // Install Valheim
    const valheimInstalled = await manager.installer.validateValheim();
    if (!valheimInstalled) {
        if (!await manager.installer.installValheim()) process.exit();
        await manager.system.wait(3);
    }

    // Generate the launch file 
    if (!await manager.launcher.generateLauncher()) process.exit();

    // Attempt to start the server. If it fails an update may be needed
    const valheimStarted = await manager.launcher.startValheim();
    if (!valheimStarted) {
        manager.logger.general('Initial launch failed. Attempting to update steam and valheim...');
        await manager.launcher.stopValheim();
        if (!await manager.installer.installSteam()) process.exit();
        await manager.system.wait(3);
        if (!await manager.installer.installValheim()) process.exit();
        await manager.system.wait(3);
        if (!await manager.launcher.startValheim()) process.exit();
    }

    // Enable auto restart if configured
    if (manager.config.manager.autoRestartServer) {
        await manager.launcher.enableAutoStart();
    }

    // Monitor for commands
    rl.on('line', async line => {
        if (!line || line.length < 1) return;
        const commandResult = await manager.execute(line);
        manager.logger.general(commandResult);
    });
    manager.logger.general('Initialization has completed. You can now execute commands (command-list)');

}


/////////////////////////////////////////////////
//    Script execution supporting functions    //
/////////////////////////////////////////////////


/**
 * Prompts the user to answer a question in the terminal
 * @param {String} question - The question to display to the user
 * @param {Function<String>} errorCheck - A callback function for validating the users response. 
 * @returns {String} The users validated response
 */
function prompt(question, errorCheck) {
    return new Promise(function(resolve, reject) { 
        rl.question(question + '\n > ', async answer => {
            console.log('');
            if (errorCheck != undefined) {
                const errors = await errorCheck(answer);
                if (errors) {
                    console.log(`There was an error processing that response - ${errors}`);
                    const newResponse = await prompt(question, errorCheck);
                    return resolve(newResponse);
                }
            }
            resolve(answer);
        });
    });
}


/**
 * Works with the user to fill in a valheim manager configuration file
 * @returns {String} The path to the newly created config file
 */
async function setupConfig() {

    // Gather the users preferences
    const saveLocation = await prompt('Where would you like to save this file?', answer => {
        if (!fs.existsSync(path.resolve(answer))) return 'This does not seem to be a valid path.';
    });
    const backupFrequency = await prompt('How often(in minutes) would you like to create backups?', answer => {
        if (isNaN(answer) || answer < 0) return 'This needs to be a number greater than 0.';
    });
    const backupRetention = await prompt('How many backups should be kept at one time?', answer => {
        if (isNaN(answer) || answer < 0) return 'This needs to be a number greater than 0.';
    });
    const worldName = await prompt('What would you like to name the valheim world?', answer => {
        if (answer.length < 1 || answer.length > 20) return 'Try a name between 1 and 20 characters long.';
    });
    const serverName = await prompt('What would you like the server name to be in the server browser?', answer => {
        if (answer.length < 1 || answer.length > 20) return 'Try a name between 1 and 20 characters long.';
    });
    const serverPassword = await prompt('What should the server password be?', answer => {
        if (answer.length < 4 || answer.length > 20) return 'Try a password between 4 and 20 characters long.';
    });
    const serverPort = await prompt('What port should the server use? The default port is 2456.', answer => {
        if (isNaN(answer) || answer < 1024 || answer > 65535) return 'The port should be between 1024 and 65535.';
    });
    const autoOpenPorts = await prompt('Would you like the manager to try automatically opening the ports?', answer => {
        if (!answer.toLowerCase().startsWith('y') && !answer.toLowerCase().startsWith('n')) return 'You need to answer with a yes or a no.';
    });
    const autoRestarts = await prompt('Would you like the manager to automatically restart the server if it stops?', answer => {
        if (!answer.toLowerCase().startsWith('y') && !answer.toLowerCase().startsWith('n')) return 'You need to answer with a yes or a no.';
    });
    const discordSetup = await prompt('Would you like to use Valheim Manager as a Discord bot?', answer => {
        if (!answer.toLowerCase().startsWith('y') && !answer.toLowerCase().startsWith('n')) return 'You need to answer with a yes or a no.';
    });
    let token, serverId, adminRoleId, serverLogChannel, commandLogChannel;
    if (discordSetup.toLowerCase().startsWith('y')) {
        const instructions = `https://github.com/chegele/ValheimManager/blob/master/README.md#discord-bot`;
        console.log(`\n Follow the instructions below for help with this portion of the setup.\n${instructions}`);
        token = await prompt('What is your bots login token?', answer => {
            if (answer.length < 20) return 'The discord login token is expected to be much longer.';
        });
        serverId = await prompt('What is your discord servers id?', answer => {
            if (answer.length != 18) return 'A discord id is expected to be 18 characters long.';
        });
        adminRoleId = await prompt('What is the id of your servers admin/mod role?', answer => {
            if (answer.length != 18) return 'A discord id is expected to be 18 characters long.';
        });
        serverLogChannel = await prompt('What is the id of the channel you would like to use for server logs?', answer => {
            if (answer.length != 18) return 'A discord id is expected to be 18 characters long.';
        });
        commandLogChannel = await prompt('What is the id of the channel you would like to use for logging commands?', answer => {
            if (answer.length != 18) return 'A discord id is expected to be 18 characters long.';
        });
    }

    // Construct the configuration object
    const config = defaultConfig;
    config.manager.configLocation = path.resolve(saveLocation, 'vmConfig.json');
    config.manager.serverLocation = path.resolve(saveLocation, 'server/');
    config.manager.backupFrequency = Number(backupFrequency);
    config.manager.backupRetention = Number(backupRetention);
    config.manager.autoOpenPorts = autoOpenPorts.toLowerCase().startsWith('y');
    config.manager.autoRestartServer = autoRestarts.toLowerCase().startsWith('y');
    config.launcher.port = Number(serverPort);
    config.launcher.world = worldName;
    config.launcher.name = serverName;
    config.launcher.password = serverPassword;
    config.logging.filePath = path.resolve(saveLocation, 'logs/');
    if (discordSetup.toLowerCase().startsWith('y')) {
        config.discord.token = token;
        config.discord.serverId = serverId;
        config.discord.adminRoleId = adminRoleId;
        config.discord.serverLogChannel = serverLogChannel;
        config.discord.commandLogChannel = commandLogChannel;
    }

    // Save the file and return the path
    await fs.writeFile(config.manager.configLocation, JSON.stringify(config, undefined, 2));
    return config.manager.configLocation;
}

module.exports.execute = execute;
execute().catch(err => {
    const msg = `The Valheim Manager has encountered an unexpected error.\n${err.stack}`;
    if (logger) {
        logger.error(msg);
    } else {
        console.log(msg);
    }  
});