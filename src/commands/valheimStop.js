
const Command = require('./command');

module.exports = class StartValheim extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "valheim-start";
        this.example = "valheim-start";
        this.description = "starts the valheim dedicated server";
        this.acknowledgment = 'Starting the valheim dedicated server...';
    }

    async execute() {
        const pid = await this.manager.launcher.startValheim().catch(err => {
            if (!err.message.includes('A valheim dedicated server is already running')) throw err;
        });
        if (!pid) return 'A valheim dedicated server is already running';
        return 'Successfully started the server.';
    }
}