
const Command = require('./command');

module.exports = class ValheimStatus extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "valheim-status";
        this.example = "valheim-status";
        this.description = "Shows the current status of the Valheim Dedicated Server.";
        this.acknowledgment = 'Checking the status of the server...';
    }

    async execute() {
        const ram = this.manager.system.memoryStats();
        const cpu = await this.manager.system.cpuStats();
        const running = await this.manager.launcher.isValheimRunning();

        const stats = (
            `Status: ${running ? 'Running' : 'Not running'}`
            + `\nCPU Use: ${cpu.percentUse}% (${cpu.cores} cores)`
            + `\nMemory Use: ${ram.percentUse}% of ${ram.total}MB`
        );

        return stats;

    }
}