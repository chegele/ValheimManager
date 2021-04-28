
const Command = require('./command');

module.exports = class BackupList extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "backup-list";
        this.example = "backup-list";
        this.description = "Displays a list of backups available for the configured world.";
        this.acknowledgment = `Retrieving the backups for ${this.manager.config.launcher.world}...`;
    }

    async execute() {
        const backups = await this.manager.backups.getBackups();
        if (backups.length < 1) return 'Unable to locate any backups';
        const backupResults = [];
        for (const backup of backups) {
            backupResults.push(
                '**' + backup.fileName + '**'
                + '\n  age: ' + (backup.age / 3600000).toFixed(2) + 'h'
                + '\n  size: ' + Math.floor(backup.size / 1024) + 'kb'
            );
        }
        return backupResults.join('\n');
    }
}