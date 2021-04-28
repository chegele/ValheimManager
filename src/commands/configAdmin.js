
const Command = require('./command');

module.exports = class ConfigAdmin extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "config-admin";
        this.example = "config-admin <add | remove | list> <steamid>";
        this.description = "Adds, removed, and lists ids from the valheim admin file.";
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
            const added = await this.manager.valFiles.addAdminId(userId);
            if (!added) return 'Failed to add the user to the admin file.';
            return 'Successfully added the user to the admin file.';
        }

        if (action == 'remove') {
            const removed = await this.manager.valFiles.removeAdminId(userId);
            if (!removed) return 'Failed to remove the user from the admin file.';
            return 'Successfully removed the user from the admin file.';
        }

        if (action == 'list') {
            const adminList = await this.manager.valFiles.getAdminIds();
            if (!adminList || adminList.length < 1) return 'Failed to identify any ids in the admin file.';
            return adminList.join('\n');
        }
    }
}