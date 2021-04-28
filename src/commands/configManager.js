
const Command = require('./command');

module.exports = class ConfigManager extends Command {
    
    constructor(manager) {
        super(manager);
        this.name = "config-manager";
        this.example = "config-manager <view | set> <property> <value>";
        this.description = "Displays or sets a value for the valheim manager configuration.";
        this.arguments = 2;
        this.acknowledgment = undefined;
    }

    async execute(args) {

        // validate the arguments
        const action = args.shift().toLowerCase();
        const property = args.shift();
        const value = args.join(' ');
        if (!['view', 'set'].includes(action)) return `The first argument should be view or set. You provided ${action}.`;
        if (action == 'set' && args[0] === undefined) return `You need to provide a value for setting this property to.`;

        // Validate the property exists
        const propValue = await this.manager.valFiles.getConfigValue(property);
        if (propValue === undefined) return `The property ${property} does not seem to be valid. You must manually add it to the configuration file.`;

        // Prevent sensitive properties from being viewed or modified
        const blacklistedProperties = ['discord.token', 'launcher.password', 'discord.adminRoleId'];
        if (blacklistedProperties.includes(property)) {
            return 'This is a protected property. It can not be viewed or modified using commands.';
        }

        // perform the action
        if (action == 'view') return `${property} = ${propValue}`;
        if (action == 'set') {
            const modified = await this.manager.valFiles.setConfigValue(property, value);
            if (!modified) return ' Failed to set the property to a new value. View the manager logs for additional details.';
            return `Successfully updated ${property} from ${propValue} to ${value}.`;
        }
    }
}