
module.exports = {

    manager: {
        autoOpenPorts: false,
        configLocation: './vmConfig.json',
        serverLocation: './server/',
        backupFrequency: 60,
        backupRetention: 6
    },

    launcher: {
        port: 2456,
        world: 'ManagedWorld',
        name: 'ManagedServer',
        password: 'password'
    },

    logging: {
        logDebug: true,
        logDetail: true,
        logGeneral: true,
        logWarning: true,
        logError: true,
        prefix: "ValheimManager - ",
        writeLog: true,
        fileName: "ManagerLog.txt",
        filePath: "./logs/",
        fileSize: "100M",
        fileAge: 7,
        fileCount: 4
    }

}