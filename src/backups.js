
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

module.exports = class ValheimBackups {
    

    /** @param {Manager} manager */
    constructor(manager) {

        if (manager.config.manager.operatingSystem == 'win32') {
            this.worldsPath = path.join(os.homedir(), 'AppData/LocalLow/IronGate/Valheim/worlds');
        } else {
            this.worldsPath = path.join(os.homedir(), '.config/unity3d/IronGate/Valheim/worlds');
        }

        this.manager = manager;
        this.buFrequency = manager.config.manager.backupFrequency;
        this.buLimit = manager.config.manager.backupRetention;
        this.worldName = manager.config.launcher.world;
        this.backupPath = path.resolve(manager.config.manager.serverLocation, 'backups', this.worldName);
        this.dbFilePath = path.join(this.worldsPath, this.worldName + '.db');
        this.fwlFilePath = path.join(this.worldsPath, this.worldName + '.fwl');

        this.resumeBackups();
    }


    /**
     * Attempts to create a backup of the currently configured Valheim world.
     * @throws {Error<String>} Errors need to be caught and should provide detail about the problem.
     * @returns {BackupEntry} Information about the new backup.
     */
    async createBackup() {
        try {
            // Validate files exists
            const dbFileStats = await fs.stat(this.dbFilePath);
            const fwlFileStats = await fs.stat(this.fwlFilePath);
            if (!dbFileStats.size > 0 || !fwlFileStats.size > 0) {
                throw new Error(`One or more of the world files have no data. \n${this.dbFilePath}\n${this.fwlFilePath}`);
            }

            // Create the backup
            const date = new Date().toISOString().replace(/T/, ' ').replace(':', '-').substring(0, 16);
            const destination = path.join(this.backupPath, date + '.zip');
            await this.manager.system.zip([this.dbFilePath, this.fwlFilePath], destination);

            // Validate the backup
            const backupStats = await fs.stat(destination);
            if (!backupStats.size > 0 ) throw new Error(`The backup has no data. \n${destination}`);

            // Return the backup object
            return {
                fileName: date + '.zip',
                worldName: this.worldName,
                fullPath: destination,
                date: new Date(),
                age: 0,
                size: backupStats.size
            }

        }catch (err) {
            throw new Error('Backup Failed: ' + err);
        }
    }


    /**
     * Retrieves a lis of the backups for the currently configured Valheim world. 
     * @returns {BackupEntry[]} Information about the current backups.
     */
    async getBackups() {

        // Get a list of files
        const files = await fs.readdir(this.backupPath);
        if (!files || files.length < 1) return [];

        // Retrieve the backup details
        const results = [];
        const now = new Date();
        for (const file of files) {
            const fullPath = path.join(this.backupPath, file);
            const stats = await fs.stat(fullPath);
            const dateSegments = file.replace(' ', '-').replace('.zip', '').split('-');
            dateSegments[1] = dateSegments[1] - 1; // Accommodate for weird month bug in JS Dates
            const date = new Date(...dateSegments);
            results.push({
                fileName: file,
                worldName: this.worldName,
                fullPath,
                date,
                age: date - now,
                size: stats.size
            });
        }

        // Return the results
        return results;
    }


    /**
     * Attempts to restore a world from the provided backup path.
     * @param {String} backupPath - The full path to the Valheim world backup.
     * @throws {Error} The original files will be restored before throwing the error.
     */
    async restore(backupPath) {
        let filesMoved = false;
        try {
            // Validate the backup 
            this.manager.logger.general(`Attempting to restore the world form ` + backupPath);
            const stats = await fs.stat(backupPath);
            if (!stats || stats.size < 1) throw new Error('There is no data in this backup\n' + backupPath);

            // remove previous .old files
            const oldDbExists = await fs.access(this.dbFilePath + '.old').then(() => true).catch(() => false);
            const oldFwlExists = await fs.access(this.fwlFilePath + '.old').then(() => true).catch(() => false);
            if (oldDbExists) await fs.rm(this.dbFilePath + '.old');
            if (oldFwlExists) await fs.remove(this.fwlFilePath + '.old');

            // Backup the current world files as .old 
            await fs.rename(this.dbFilePath, this.dbFilePath + '.old').catch(() => false);
            await fs.rename(this.fwlFilePath, this.fwlFilePath + '.old').catch(() => false);
            filesMoved = true;

            // Restore the backup and validate files
            await this.manager.system.unzip(backupPath, this.worldsPath);
            const dbStats = await fs.stat(this.dbFilePath);
            const fwlStats = await fs.stat(this.fwlFilePath);
            if (dbStats.size < 1 || fwlStats.size < 1) throw new Error('Restored files have no data');
            this.manager.logger.general(`Successfully restored the world form ` + backupPath);

        } catch (err) {
            // On error attempt to revert the files to a known state
            if (filesMoved) {
                await fs.rename(this.dbFilePath + '.old', this.dbFilePath);
                await fs.rename(this.fwlFilePath + '.old', this.fwlFilePath);
            }
            throw new Error(`Failed to restore the world from the backup. \nBackup: ${backupPath} \nError: ${err.stack}`);
        }
    }


    /** Remove backups that exceed the configured threshold */
    async cleanBackups() {
        const limit = this.manager.config.manager.backupRetention;
        const backups = await this.getBackups();
        if (backups.length > limit) {
            const sorted = backups.sort((a, b) => a.age > b.age ? 1 : -1);
            for (let i = 0; i < (backups.length - limit); i++) {
                try {
                    await fs.rm(sorted[i].fullPath);
                } catch (err) {
                    this.manager.logger.error(`Failed to remove a backup \nError${err}`, true);
                }
            }
        }
    }


    /** Schedules automatic backups and cleanup with the configured frequency*/
    resumeBackups() {
        const backups = this;
        const frequency = this.buFrequency * 1000 * 60;
        backups.backuper = setInterval(async function() {
            try {
                const backup = await backups.createBackup();
                backups.manager.logger.general('Successfully created new automatic backup - ' + backup.fileName);
                await backups.cleanBackups();
            } catch (err) {
                backups.manager.logger.error(`Unexpected error during automatic backup \nError${err}`, true);
            }
        }, frequency);
    }

    /** Stops any additional automatic backups from taking place */
    pauseBackups() {
        if (this.backuper) clearInterval(this.backuper);
    }

}