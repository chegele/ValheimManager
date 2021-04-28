
const Command = require('./command');

module.exports = class UpdateSteam extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "update-steam";
        this.example = "update-steam";
        this.description = "Automatically updates to the newest version of the steam CLI.";
        this.acknowledgment = 'Updating steam...';
    }

    async execute() {
        const updated = await this.manager.installer.installSteam();
        if (!updated) return 'Failed to install/update steam.';
        return 'Successfully installed/updated steam.';
    }
}