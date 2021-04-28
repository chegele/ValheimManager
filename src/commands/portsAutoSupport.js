
const Command = require('./command');

module.exports = class PortsAutoSupport extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "ports-auto-support";
        this.example = "ports-auto-support";
        this.description = "Determines if your router supports automatic port management services.";
        this.acknowledgment = 'Checking your routers support for UPnP services...';
    }

    async execute() {
        const result = await this.manager.system.checkNatSupport();
        if (!result) return 'Failed to check for automatic port mapping.';
        return JSON.stringify(result, undefined, 2);
    }
}