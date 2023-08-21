
module.exports = {

    manager: {
        configLocation: './vmConfig.json',
        serverLocation: './server/',

        //patches < 0.209.8 (client) and possibly build 8977163 dedicated server need to set this as true
        legacyBackupLocation: false,
        backupFrequency: 60,
        backupRetention: 6,
        autoOpenPorts: false,
        autoRestartServer: true
    },

    launcher: {
        port: 2456,
        world: 'ManagedWorld',
        name: 'ManagedServer',
        password: 'password'
    },

    discord: {
        token: '',
        serverId: '',
        adminRoleId: '',
        serverLogChannel: '',
        commandLogChannel: ''
    },

    logging: {
        logDebug: false,
        logDetail: false,
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