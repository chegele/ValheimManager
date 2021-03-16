
module.exports = {

    manager: {
        operatingSystem: String,
        serverLocation: String,
        linuxPackageManager: String
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