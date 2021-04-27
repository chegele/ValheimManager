
const Command = require('./command');

module.exports = class BackupCreate extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "backup-create";
        this.example = "backup-create";
        this.description = "Creates a new backup of the configured world.";
        this.acknowledgment = 'Creating a new backup of ' + this.manager.config.launcher.world + '...';
    }

    async execute() {
        try {
            const backup = await this.manager.backups.createBackup();
            if (backup.fileName) return (
                'Successfully created a new backup!'
                + '\n  World: ' + backup.worldName
                + '\n  Name: ' + backup.fileName
                + '\n  Size: ' + Math.floor(backup.size / 1024) + 'KB'
            );
            } catch (err) {
                this.manager.logger.error(err);
                return 'There was an error creating the backup. Review the manager logs for details.';
        }
    }
}