
# Valheim Manager
A node.js application for managing valheim dedicated servers.
https://www.valheimgame.com/

## Features
   - Windows & Linux support
   - Steam installation/updates
   - Valheim installation/updates
   - Valheim launches and automatic restarts
   - Automatic world backups and restores
   - Admin, banned, and permitted users management
   - Automated port configuration (open/close router ports)
   - System processor and memory checks/monitor
   - Command Line Interface for setup and commands
   - Full discord integration for monitor and commands

## Installation & Setup

1. Install Node.js - https://nodejs.org/en/
2. Open a terminal or command prompt.
3. Run the below command to install the tool.
    - npm install -g valheim-manager
4. Type the below command to launch the tool.
    - valheim-manager
    - Note: If you get an error stating "Cannot find module" you forgot to use -g when installing.
5. Follow the prompt to generate a new configuration. 
6. Allow the manager to take care of the rest! 

To save time on future launches, navigate to the location where you saved your configuration before starting the valheim manager.
```
cd C:\Users\scheg\Documents\ValheimManager\
node valheim-manager
```

## Commands
Once the manager completes initialization, you can use any of the commands below to manage your server. These commands will also be available via discord if you chose to setup a discord bot. 

 - backup-create - Creates a new backup of the configured world.
 - backup-list - Displays a list of backups available for the configured world.
 - backup-pause - disables automatic backups until re-enabled, or the next vm restart.
 - backup-restore - stops valheim, restores from a backup, and restarts valheim.
 - backup-resume - Enables automatic backups using the configured interval.
 - config-admin - Adds, removed, and lists ids from the valheim admin file.
 - config-banned - Adds, removed, and lists ids from the valheim banned file.
 - config-manager - Displays or sets a value for the valheim manager configuration.
 - config-permit - Adds, removed, and lists ids from the valheim permitted players file.
 - ports-auto-support - Determines if your router supports automatic port management services.
 - ports-close - Closes the game ports if they were automatically opened.
 - ports-open - Opens the game ports on your router using UPnP services.
 - update-manager - Checks for new versions of the valheim manager.
 - update-steam - Automatically updates to the newest version of the steam CLI.
 - update-valheim - Automatically updates to the newest version of the Valheim Dedicates Server.
 - valheim-autostart-off - Disables automatic restarts of the valheim dedicated server.
 - valheim-autostart-on - Enables automatic restarts of the valheim dedicated server.
 - valheim-stop - stops the valheim dedicated server
 - valheim-start - starts the valheim dedicated server
 - valheim-status - Shows the current status of the Valheim Dedicated Server.

## Discord Bot
The Valheim Manager can be used as a discord bot. The below instructions will help you register the bot with discord and gather the configuration items the bot will need.

1. Create a new discord application - https://discord.com/developers/applications
2. Select Bot under the settings, and then add bot
3. Take note of the bots TOKEN. This is essentially the bots username and password for discord.
4. Select OAuth under setting and take not of the CLIENT ID.
5. Invite the bot to your discord server by using the link below (replace INSERT_CLIENT_ID_HERE with your id)
    - https://discord.com/oauth2/authorize?client_id=INSERT_CLIENT_ID_HERE&scope=bot&permissions=3072
6. Gather your discord ids by right clicking items in discord and selecting "Copy Id"
    - Discord server id - The discord server the bot should pay attention to
    - Admin / mod role - Anyone with this role will be able to use commands
    - server log channel - The server log will feed to this channel
    - command log channel - All commands will be logged here
