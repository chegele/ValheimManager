
const Command = require('./command');

module.exports = class ReportBug extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "report-bug";
        this.example = "report-bug";
        this.description = "Provides instructions for reporting a Valheim Manager bug.";
        this.acknowledgment = undefined;
    }

    async execute() {
        const supportLink = 'https://github.com/chegele/ValheimManager/issues';
        return 'Ohh no! Please check to see if your problem has already been reported. If you are the first to have this issue, push the green button to open a new issue\n.' + supportLink;

    }
}