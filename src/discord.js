
const Discord = require('discord.js');

module.exports = class DiscordBot {

    /** @param {Manager} manager */
    constructor(manager) {
        this.manager = manager;
        this.config = manager.config.discord;
        if (this.config.token) this.prepDiscord();

    }

    prepDiscord() {

        // Setup error and message listeners
        const bot = this;
        this.client = new Discord.Client();
        this.client.on('error', err => bot.manager.logger.error(`Discord Error - ${err.stack}`));
        this.client.on('message', message => {this.handleMessage(message)});

        this.client.on('ready', async () => {
            try {

                // Validate the user configured ids. 
                bot.manager.logger.general('(Discord) Successfully logged into discord. Validating access and ids...');
                const server = await bot.client.guilds.fetch(bot.config.serverId);
                if (!server) throw new Error('(Discord) Failed to identify the discord server. Maybe the id is wrong or this bot has not yet been invited?');
                bot.manager.logger.general(`(Discord) Successfully identified the ${server.name} discord server.`);
                const adminRole = await server.roles.fetch(bot.config.adminRoleId);
                if (!adminRole) throw new Error('(Discord) Failed to identify the admin role. Maybe the id is wrong?');
                bot.manager.logger.general(`(Discord) Recognized the "${adminRole.name}" role as the admin role.`);
                const commandLogChannel = await bot.client.channels.fetch(bot.config.commandLogChannel);
                if (!commandLogChannel) throw new Error('(Discord) Failed to identify the command log channel. Maybe the id is wrong or the bot does not have permission to see it?');
                bot.manager.logger.general(`(Discord) Using the ${commandLogChannel.name} discord channel for command logging.`);
                const serverLogChannel = await bot.client.channels.fetch(bot.config.serverLogChannel);
                if (!serverLogChannel) throw new Error('(Discord) Failed to identify the server log channel. Maybe the id is wrong or the bot does not have permission to see it?');
                bot.manager.logger.general(`(Discord) Using the ${serverLogChannel.name} discord channel for server logging.`);
    
                // Attach the discord objects to this module
                bot.server = server;
                bot.adminRole = adminRole;
                bot.commandLogChannel = commandLogChannel;
                bot.serverLogChannel = serverLogChannel;
    
                // Setup the server to discord logging
                bot.manager.launcher.subscribeToServerLog(async data => {
                    try {
                        const parts = data.match(/(.|[\r\n]){1,2000}/g);
                        for (const part of parts) {
                            if (part.includes('password')) return;
                            await serverLogChannel.send(part);
                        }
                    } catch (err) {
                        bot.manager.logger.error('Failed to send server log chunk to discord.\n' + err.stack);
                    }
                });
    
                // Inform the user of success or handle the error and disable discord functionality
                bot.manager.logger.general('(Discord) Discord bot ready.');
            } catch (err) {
                if (bot.client) bot.client.destroy();
                bot.manager.logger.error('(Discord) The discord bot has encountered an error during setup. This feature has been disabled.\n' + err.stack);
            }
        });

        bot.manager.logger.general('(Discord) Attempting to login to discord...');
        this.client.login(this.config.token);
    }

    /**
     * Handles discord messages
     * @param {Discord.Message} message 
     */
    async handleMessage(message) {
        const bot = this;
        try {
            // Validate this is a command from the appropriate guild
            if (message.guild.id != bot.config.serverId) return;
            if (!message.content.startsWith('/vm ')) return;

            // Validate that the user is authorized to use commands
            if (!message.member.roles.cache.has(bot.config.adminRoleId)) {
                return await message.reply('You do not have permissions to use /vm commands.');
            }

            // Remove the prefix and process the command
            const command = message.content.replace('/vm ', '');
            bot.commandLogChannel.send(`${message.author.id}(${message.member.nickname}) ${command}`);
            const result = await bot.manager.execute(command, ack => message.channel.send(ack));
            await message.channel.send(result);

        } catch(err) {
            bot.manager.logger.error('Error handling discord message.\n' + err.stack);
        }
    }
    
}