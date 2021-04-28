
const Command = require('./command');

module.exports = class BackupResume extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "backup-resume";
        this.example = "backup-resume";
        this.description = "Enables automatic backups using the configured interval.";
        this.acknowledgment = 'Re-enabling automatic backups for ' + this.manager.config.launcher.world + '...';
    }

    async execute() {
        await this.manager.backups.resumeBackups();
        if (!this.manager.backups.backuper) return 'Failed to resume automatic backups';
        return 'Successfully resumed automated backups.';
    }
}