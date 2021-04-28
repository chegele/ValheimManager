
const Command = require('./command');

module.exports = class UpdateValheim extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "update-valheim";
        this.example = "update-valheim";
        this.description = "Automatically updates to the newest version of the Valheim Dedicates Server.";
        this.acknowledgment = 'Updating Valheim...';
    }

    async execute() {
        const updated = await this.manager.installer.installValheim();
        if (!updated) return 'Failed to install/update Valheim.';
        return 'Successfully installed/updated Valheim.';
    }
}