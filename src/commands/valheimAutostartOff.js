
const Command = require('./command');

module.exports = class ValheimAutoOff extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "valheim-autostart-off";
        this.example = "valheim-autostart-off";
        this.description = "Disables automatic restarts of the valheim dedicated server.";
        this.acknowledgment = undefined;
    }

    async execute() {
        this.manager.launcher.autoStart = false;
        return 'Disabled automatic restarts';
    }
}