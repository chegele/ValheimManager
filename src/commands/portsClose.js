
const Command = require('./command');

module.exports = class PortsClose extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "ports-close";
        this.example = "ports-close";
        this.description = "Closes the game ports if they were automatically opened.";
        this.acknowledgment = 'Attempting to close the configured ports...';
    }

    async execute() {
        try {
            const closed = await this.manager.system.autoCloseServerPorts();
            if (!closed) return 'Failed to close the ports.';
            return 'Successfully closed the ports.';
        } catch(err) {
            return 'Encountered an error while attempting to close the ports. Maybe automatic port management is not enabled on your router?';
        }
    }
}