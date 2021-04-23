
const Command = require('./command');

module.exports = class StartValheim extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "start-valheim";
        this.example = "start-valheim";
        this.description = "starts the valheim dedicated server";
        this.acknowledgment = 'Starting the valheim dedicated server...';
    }

    async execute() {
        const pid = await this.manager.launcher.startValheim().catch(err => {
            if (err.message.includes('A valheim dedicated server is already running')) {
                return 'A valheim dedicated server is already running';
            } else {
                throw err;
            }
        });
        return 'Successfully started the server.';
    }
}