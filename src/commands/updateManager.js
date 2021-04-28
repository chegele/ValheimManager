
const Command = require('./command');

module.exports = class UpdateManager extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "update-manager";
        this.example = "update-manager";
        this.description = "Checks for new versions of the valheim manager.";
        this.acknowledgment = 'Checking for new versions...';
    }

    async execute() {
        const remote = await this.manager.system.readRemoteVersion();
        const local = await this.manager.system.readLocalVersion();
        if (!remote || !local) return 'Failed to compare versions.';
        if (local != remote) {
            return `An update(${remote}) is available. You can install it using "npm update -g"`;
        } else {
            return`Valheim Manager is up to date.`;
        }
    }
}