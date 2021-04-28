
const Command = require('./command');

module.exports = class ValheimAutoOn extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "valheim-autostart-on";
        this.example = "valheim-autostart-on";
        this.description = "Enables automatic restarts of the valheim dedicated server.";
        this.acknowledgment = undefined;
    }

    async execute() {
        await this.manager.launcher.enableAutoStart();
        return 'Enabled automatic restarts';
    }
}