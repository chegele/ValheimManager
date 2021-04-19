
module.exports = {

    manager: {
        operatingSystem: String,
        autoOpenPorts: Boolean,
        configLocation: String,
        serverLocation: String,
        backupFrequency: Number,
        backupRetention: Number
    },

    launcher: {
        port: Number,
        world: String,
        name: String,
        password: String
    },

    logging: {
        logDebug: Boolean,
        logDetail: Boolean,
        logGeneral: Boolean,
        logWarning: Boolean,
        logError: Boolean,
        prefix: String,
        writeLog: Boolean,
        fileName: String,
        filePath: String,
        fileSize: String,
        fileAge: Number,
        fileCount: Number
    }

}