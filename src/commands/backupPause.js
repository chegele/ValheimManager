
const Command = require('./command');

module.exports = class BackupPause extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "backup-pause";
        this.example = "backup-pause";
        this.description = "disables automatic backups until re-enabled, or the next vm restart.";
        this.acknowledgment = 'Disabling automatic backups...';
    }

    async execute() {
        await this.manager.backups.pauseBackups();
        return 'Successfully paused automatic backups.';
    }
}