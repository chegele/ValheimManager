
const Command = require('./command');

module.exports = class CHANGEME extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "ports-open";
        this.example = "ports-open";
        this.description = "Opens the game ports on your router using UPnP services.";
        this.acknowledgment = 'Attempting to open the configured ports...';
    }

    async execute() {
        try {
            const opened = await this.manager.system.autoOpenServerPorts();
            if (!opened) return 'Failed to open the ports.';
            return 'Successfully opened the ports.';
        } catch(err) {
            return 'Encountered an error while attempting to open the ports. Maybe automatic port management is not enabled on your router?';
        }
    }
}