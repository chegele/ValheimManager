
require('./types/typedef');

const path = require('path');
const fs = require('fs-extra');

const steamCliLinkWin = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
const steamCliLinkLnx = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz";

module.exports = class Installer {

    /** @param {Manager} manager */
    constructor(manager) {
        this.manager = manager;

        // Setup directory and file paths
        this.installLocation = path.resolve(manager.config.manager.serverLocation);
        this.steamDirectory = path.join(this.installLocation, 'steam/');
        this.valheimDirectory = path.join(this.installLocation, 'valheim/');

        // Setup os specific paths and point installSteam to the correct method
        if (manager.config.manager.operatingSystem == 'win32') {
            this.steamCliPath = path.join(this.steamDirectory, 'steamcmd.exe');
            this.valheimServerPath = path.join(this.valheimDirectory, 'valheim_server.exe');
            this.installSteam = this.installSteamWindows;
        } else {
            this.steamCliPath = path.join(this.steamDirectory, 'steamcmd.sh');
            this.valheimServerPath = path.join(this.valheimDirectory, 'valheim_server.x86_64');
            this.installSteam = this.installSteamLinux;
        }
    }


    /**
     * Checks to see if steam is available in the expected location.
     * @returns {boolean} - true if steam was located.
     */
    async validateSteam() {
        try {
            await fs.access(this.steamCliPath);
            return true;
        } catch(err) {
            return false;
        }
    }


    /**
     * Linux - Installs the steam cli in a steam directory under the configured server dir.
     * @returns {boolean} - the result fo the install. Errors need to be thrown manually on fail. 
     */
    async installSteamLinux() {
        try {

            // Download steam and extract it
            this.manager.logger.general(`Downloading the steam cli from ${steamCliLinkLnx}...`);
            const downloadPath = path.join(this.steamDirectory, 'steam.tar.gz');
            await fs.ensureDir(this.steamDirectory);
            await this.manager.system.promiseDownload(steamCliLinkLnx, downloadPath);
            await this.manager.system.execute(`tar -xf ${downloadPath} -C ${this.steamDirectory}`);
            const downloaded = await this.validateSteam();
            if (!downloaded) throw new Error(`Failed to download or extract steam @ ${downloadPath}`);
            await fs.unlink(downloadPath);

            // Attempt a initial run to determine if dependencies are installed
            this.manager.logger.general(`Installing steam resources...`);
            const setupOutput = await this.manager.system.execute(`${this.steamCliPath} +exit`).catch(err => {
                if (err.message.includes('Command failed')) {
                    let error = 'Failed initial launch of steam. You may need to install dependencies.\n';
                    error += '  Ubuntu/Debian (x86-64): sudo apt-get install lib32gcc1\n';
                    error += '  RedHat/CentOS (x86-64): yum install glibc.i686 libstdc++.i686\n';
                    err.message = error + err.message;
                }
                throw err;
            });

            // Validate the output of the initial run. 
            if (!setupOutput.includes('Update complete, launching Steamcmd...') ||
            !setupOutput.includes('Loading Steam API...OK')) {
                let error = 'Steam did not return the expected result.\n';
                error += '== Steam cmd log details ==\n' + setupOutput;
                throw new Error(error);
            }

            this.manager.logger.general('Successfully installed steam.');
            return true;
        } catch (err) {
            this.manager.logger.error(`There was an error while attempting to install the steam cli.\n${err}`, true);
            return false;
        }
    }


    /**
     * Windows - Installs the steam cli in a steam directory under the configured server dir.
     * @returns {boolean} - the result fo the install. Errors need to be thrown manually on fail. 
     */
    async installSteamWindows() {
        try {

            // Download and extract steam 
            this.manager.logger.general(`Downloading the steam cli from ${steamCliLinkWin}...`);
            const downloadPath = path.join(this.steamDirectory, 'steam.zip');
            await fs.ensureDir(this.steamDirectory);
            await this.manager.system.promiseDownload(steamCliLinkWin, downloadPath);
            await this.manager.system.unzip(downloadPath, this.steamDirectory);
            await fs.unlink(downloadPath);
            if (!this.validateSteam) throw new Error('Unable to locate the steamcmd.exe file.');

            // Attempt a initial run and validate the output
            // TODO: Initial run is always crashing steam on windows, but 2nd run works. 
            this.manager.logger.general(`Installing steam resources...`);
            let runOutput = await this.manager.system.execute(`${this.steamCliPath} +exit`).catch(err => {});
            if (!runOutput) { 
                runOutput = await this.manager.system.execute(`${this.steamCliPath} +exit`).catch(err => {
                    throw new Error('Failed initial launch of steam' + err);
                });
            }

            if (!runOutput.includes('Loading Steam API...OK')) {
                let error = 'Steam did not return the expected result.\n';
                error += '== Steam cmd log details ==\n' + runOutput;
                throw new Error(error);
            }

            this.manager.logger.general('Successfully installed steam.');
            return true;
        }catch (err) {
            this.manager.logger.error(`There was an error while attempting to install the steam cli.\n${err.stack ? err.stack : err}`, true);
            return false;
        }
    }


    /**
     * Windows - Checks to see if valheim_server is available at the configured location.
     * @returns {boolean} - true if valheim_server was located.
     */
    async validateValheim() {
        try {
            await fs.access(this.valheimServerPath);
            return true;
        } catch (err) {
            return false;
        }
    }


    /**
     * Installs or updates the Valheim dedicated server using the steam cli.
     * @returns {boolean} - the result of the install. Errors need to be thrown manually on fail. 
     */
    async installValheim() {
        try {
            this.manager.logger.general('Installing/Updating the Valheim dedicated server...');
            const command = `${this.steamCliPath} +login anonymous +force_install_dir ${this.valheimDirectory} +app_update 896660 validate +exit`;
            await fs.ensureDir(this.valheimDirectory);
            const out = await this.manager.system.execute(command);
            if (!out.includes(`Success! App '896660' fully installed.`)) throw new Error('Unable to locate the success message in steam cmd.');
            if (!await this.validateValheim()) throw new Error('Unable to locate the valheim_server file.');
            this.manager.logger.general('Successfully installed valheim.');
            return true;
        } catch (err) {
            this.manager.logger.error(`There was an error while attempting to install the valheim dedicated server.\n${err}`, true);
            return false;    
        }
    }

}

