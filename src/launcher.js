require('./types/typedef');

const Logger = require('chegs-simple-logger');
const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs-extra');

//TODO: There is a bug that causes the server to stop unexpectedly when started directly as a child process.
// To circumvent this, a launch file is currently being created (shell or batch), and then executed as the child process.
// It would be ideal to determine what is causing this bug and abandoned the launch files. 

module.exports = class ValheimLauncher {

    /** @param {Manager} manager */
    constructor(manager) {

        this.manager = manager;
        this.valheimPath = manager.installer.valheimDirectory;
        this.autoStart = false;

        // Use Logger for managing the log files, but do not use it to log
        // Instead, append to the file directly. This will prevent it from showing in the console
        this.serverLogConfig = {...this.manager.config.logging};
        this.serverLogConfig.fileName = 'ServerLog.txt';
        this.serverLogPath = path.resolve(this.serverLogConfig.filePath, this.serverLogConfig.fileName);
        if (!fs.existsSync(this.serverLogPath)) fs.createFileSync(this.serverLogPath);
        this.serverLog = new Logger(this.serverLogConfig);

        // Setup log buffer for discord log forwarding
        this.recentLogs = [];
        this.onLogBuffer = [];
        const launcher = this;
        this.logBuffer = setInterval(function() {
            if (launcher.recentLogs.length == 0) return;
            const chunk = launcher.recentLogs.join('');
            launcher.recentLogs = [];
            for(const callback of launcher.onLogBuffer) callback(chunk);
        }, 5 * 1000);


        // Setup the child process options
        this.spawnOptions = {
            windowsHide: true,
            killSignal: 'SIGINT',
            cwd: this.valheimPath
        }

        // Define the OS specific variables and functions
        if (manager.config.manager.operatingSystem == 'win32') {
            // This is necessary for newer NodeJS versions as the there was a change in response to
            // a security incident - see below:
            // https://github.com/nodejs/node/issues/52554
            // https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
            this.spawnOptions.shell = true;
            this.generateLauncher = this.generateWindowsLauncher;
            this.launchFile = path.join(this.valheimPath, 'launcher.bat');
            this.processName = 'valheim_server.exe';
        } else {
            this.generateLauncher = this.generateLinuxLauncher;
            this.launchFile = path.join(this.valheimPath, 'launcher.sh');
            this.processName = 'valheim_server.x86_64';
        }
    }


    /**
     * LINUX Generates a shell script for launching the valheim dedicated server. 
     * @returns {boolean} True if the file was created with the expected permissions. 
     */
    async generateLinuxLauncher() {
        this.manager.logger.general('Generating the launch file...');
        const server = this.manager.installer.valheimServerPath;
        const config = this.manager.config.launcher;
        let fileContent = `\n# Launch file generated by Valheim Manager. Not intended for manual interaction.`;
        fileContent += `\nexport TERM=xterm`;
        fileContent += `\nexport templdpath=$LD_LIBRARY_PATH`
        fileContent += `\nexport LD_LIBRARY_PATH=./linux64:$LD_LIBRARY_PATH`
        fileContent += `\nexport SteamAppId=892970`
        fileContent += `\n${server} -name "${config.name}" -port ${config.port} -world "${config.world}"`;
        if (config.password != '') fileContent += ` -password "${config.password}"`;
        fileContent += `\nexport LD_LIBRARY_PATH=$templdpath`
        await fs.writeFile(this.launchFile, fileContent);
        await fs.chmod(this.launchFile, '755');
        const stat = await fs.stat(this.launchFile);
        return stat.mode == '33261';
    }


    /**
     * WINDOWS Generates a batch script for launching the valheim dedicated server. 
     * @returns {boolean} True if the file was created with the expected permissions. 
     */
    async generateWindowsLauncher() {
        this.manager.logger.general('Generating the launch file...');
        const server = this.manager.installer.valheimServerPath;
        const config = this.manager.config.launcher;
        let fileContent = `\nREM Launch file generated by Valheim Manager. Not intended for manual interaction.`;
        fileContent += `\nset SteamAppId=892970`;
        fileContent += `\n${server} -nographics -batchmode -name "${config.name}" -port ${config.port} -world "${config.world}"`;
        if (config.password != '') fileContent += ` -password "${config.password}"`;
        await fs.writeFile(this.launchFile, fileContent);
        const stat = await fs.stat(this.launchFile);
        return stat.mode == '33206';
    }


    /**
     * Checks to see if a valheim server is running
     * @returns {SystemProcess | null} The pid and name of the process or null
     */
    async isValheimRunning() {
        return await this.manager.system.findProcess(this.processName);
    }


    /**
     * Attempts to launch a valheim dedicated server
     * If the launch fails and error will be thrown
     * @returns {SystemProcess} - The pid and process name on success
     */
    async startValheim() {

        // Validate the a server is not already running 
        this.manager.logger.general('Starting the valheim dedicated server...');
        const running = await this.isValheimRunning();
        if (running) throw new Error(`A valheim dedicated server is already running with pid ${running.pid}`);

        // Warn if no password
        if (this.manager.config.launcher.password == '') {
            this.manager.logger.warning('Valheim Manager is configured to run without a server password. This can prevent Valheim from starting.');
            this.manager.logger.warning('You can enable no password servers with mods - https://www.nexusmods.com/valheim/mods/578');
        }

        // Launch the server
        this.vdsProcess = spawn(this.launchFile, this.spawnOptions);
        this.vdsProcess.stdout.on('data', async data => {
            data = data.toString().replace('\n', '');
            await fs.appendFile(this.serverLogPath, data);
            this.recentLogs.push(data);
        });
        this.vdsProcess.stderr.on('data',  async data => {
            data = data.toString().replace('\n', '');
            await fs.appendFile(this.serverLogPath, data);
            this.recentLogs.push(data);
        });

        // Validate the launch with 3 checks over 30 seconds
        let pid = null;
        for (let checks=0; checks < 3; checks++) {
            await this.manager.system.wait(10);
            pid = await this.isValheimRunning();
            if (!pid) throw new Error('Valheim failed to start. Review the ServerLog.txt file for more details.');
        }
        this.manager.logger.general('Successfully started the valheim server.');
        this.manager.logger.general(`Server logs can be viewed in ${this.serverLogConfig.fileName}`);
        return pid;
    }


    /**
     * Attempts to kill the server with a sigint.
     * Will throw an error if it fails to stop Valheim.
     * @returns {boolean} true if all valheim processes have stopped.
     */
    async stopValheim() {
        // Attempt to kill the process up to 3 times over 30 seconds
        this.manager.logger.general('Stopping the valheim dedicated server...');
        this.autoStart = false;
        for (let checks=0; checks < 3; checks++) {
            let prc = await this.isValheimRunning();
            if (prc) {
                process.kill(prc.pid, 'SIGINT');
                await this.manager.system.wait(10);
            } else {
                this.manager.logger.general('Successfully stopped valheim dedicated server.');
                return true;
            }
        }
        // Killing the process has failed
        throw new Error('Valheim failed to stop. Review the ServerLog.txt file for more details.');
    }


    /**
     * Enables a routine check for the vds process. 
     * If the process can't be found an attempt to restart will be made. 
     */
    async enableAutoStart() {
        this.manager.logger.general('Enabling automatic restarts of valheim.');
        const launcher = this;
        launcher.autoStart = true;
        setInterval(async function() {
            if (!launcher.autoStart) return clearInterval(this);
            const running = await launcher.isValheimRunning();
            if (!running) {
                launcher.manager.logger.general('[Auto Start] - Valheim is not running. Restarting the server...');
                await launcher.startValheim();
            }
        }, 30000);
    }


    /**
     * Subscribes to the server log buffer
     * The callback should take a string argument
     * @param {Function} callback - The callback that will receive the log
     */
    subscribeToServerLog(callback) {
        if (typeof(callback) != 'function') throw new Error('You must pass a callback function to subscribeToServerLog.');
        this.onLogBuffer.push(callback);
    }
    
}