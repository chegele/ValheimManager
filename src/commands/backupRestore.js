
const Command = require('./command');

module.exports = class BackupRestore extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "backup-restore";
        this.example = "backup-restore <backup-name>";
        this.description = "stops valheim, restores from a backup, and restarts valheim.";
        this.acknowledgment = `Restoring ${this.manager.config.launcher.world} to a saved backup...`;
        this.arguments = 1;
    }

    async execute(args) {
        const backupName = args.join(' ');
        try {

            // Validate the users backupName
            const backups = new Map();
            const current = await this.manager.backups.getBackups();
            for (const backup of current) backups.set(backup.fileName.toLowerCase(), backup);
            const backupObject = backups.get(backupName.toLowerCase());
            if (!backupObject) {
                let message = `The provided backup name, ${backupName}, does not exist. You need to use one of the names from below.\n ==BACKUP NAMES==`;
                for (const backup of backups.keys()) message = message + '\n ' + backup;
                return message;
            }

            // Perform the restore
            const stopped = await this.manager.launcher.stopValheim();
            if (!stopped) return 'Restored failed - unable to stop Valheim.';
            await this.manager.backups.restore(backupObject.fullPath);
            const started = await this.manager.launcher.startValheim();
            if (!started) return 'Restore failed - unable to start Valheim.';
            return 'Successfully restored and started the server.';


        } catch(err) {

            // Log errors, report the event to the user, and shutdown the server
            this.manager.logger.error(err);
            const manager = this.manager;
            setTimeout(function() { manager.launcher.stopValheim() }, 5000);
            return 'There was an unexpected error processing the restore. An emergency shutdown of the server will be initiated. It is highly recommended that you investigate this error, manually restore the world, and report this issue.';
        }
    }
}