
const Command = require('./command');

module.exports = class ConfigPermit extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "config-permit";
        this.example = "config-permit <add | remove | list> <steamid>";
        this.description = "Adds, removed, and lists ids from the valheim permitted players file.";
        this.arguments = 1;
        this.acknowledgment = undefined;
    }

    async execute(args) {
                
        // validate the arguments
        const action = args[0].toLowerCase();
        const userId = args[1];
        if (!['add', 'remove', 'list'].includes(action)) return `The first argument should be add, remove, or list. You provided ${action}`;
        if (['add', 'remove'].includes(args[0]) && !userId) return `You need to provide a steam userid as the third argument when adding or removing users.`;

        // execute the action
        if (action == 'add') {
            const added = await this.manager.valFiles.addPermittedId(userId);
            if (!added) return 'Failed to add the user to the permitted file.';
            return 'Successfully added the user to the permitted file.';
        }

        if (action == 'remove') {
            const removed = await this.manager.valFiles.removePermittedId(userId);
            if (!removed) return 'Failed to remove the user from the permitted file.';
            return 'Successfully removed the user from the permitted file.';
        }

        if (action == 'list') {
            const permittedList = await this.manager.valFiles.getPermittedIds();
            if (!permittedList || permittedList.length < 1) return 'Failed to identify any ids in the permitted file.';
            return permittedList.join('\n');
        }
    }
}