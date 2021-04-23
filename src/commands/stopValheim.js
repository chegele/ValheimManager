
const Command = require('./command');

module.exports = class StartValheim extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "stop-valheim";
        this.example = "stop-valheim";
        this.description = "stops the valheim dedicated server";
        this.acknowledgment = 'Stopping the valheim dedicated server...';
    }

    async execute() {
        const stopped = await this.manager.launcher.stopValheim().catch(err => {
            if (err.message.includes("Valheim failed to stop.")) {
                return "Valheim failed to stop. Review the ServerLog.txt file for more details.";
            } else {
                throw err;
            }
        });
        return "Successfully stopped the server."
    }
}