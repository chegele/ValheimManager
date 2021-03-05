
require('./types/typedef');

const path = require('path');
const https = require('https');
const fs = require('fs-extra');
const zip = require('adm-zip');
const execute = require('child_process').exec;

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
            this.valheimServerPath = path.join(this.valheimDirectory, 'start_server.sh');
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
            await promiseDownload(steamCliLinkLnx, downloadPath);
            const un = await promiseExecute(`tar -xf ${downloadPath} -C ${this.steamDirectory}`);
            const downloaded = await this.validateSteam();
            if (!downloaded) throw new Error(`Failed to download or extract steam @ ${downloadPath}`);
            await fs.unlink(downloadPath);

            // Attempt a initial run to determine if dependencies are installed
            this.manager.logger.general(`Installing steam resources...`);
            const setupOutput = await promiseExecute(`${this.steamCliPath} +exit`);
            if (!setupOutput.includes('Update complete, launching Steamcmd...') ||
            !setupOutput.includes('Loading Steam API...OK')) {
                let error = 'Failed initial launch of steam. You may need to install dependencies.\n';
                error += '  Ubuntu/Debian (x86-64): sudo apt-get install lib32gcc1\n';
                error += '  RedHat/CentOS (x86-64): yum install glibc.i686 libstdc++.i686\n';
                error += '== Steam cmd log details ==\n' + setupOutput;
                throw new Error(error);
            }
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
            this.manager.logger.general(`Downloading the steam cli from ${steamCliLinkWin}...`);
            const downloadPath = path.join(this.steamDirectory, 'steam.zip');
            await fs.ensureDir(this.steamDirectory);
            await promiseDownload(steamCliLinkWin, downloadPath);
            await promiseUnzip(downloadPath, this.steamDirectory);
            await fs.unlink(downloadPath);
            if (!this.validateSteam) throw new Error('Unable to locate the steamcmd.exe file.');
            return true;
        }catch (err) {
            this.manager.logger.error(`There was an error while attempting to install the steam cli.\n${err}`, true);
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
            this.manager.logger.general('Installing the Valheim dedicated server...');
            const command = `${this.steamCliPath} +login anonymous +force_install_dir ${this.valheimDirectory} +app_update 896660 validate +exit`;
            await fs.ensureDir(this.valheimDirectory);
            const out = await promiseExecute(command);
            if (!out.includes(`Success! App '896660' fully installed.`)) throw new Error('Unable to locate the success message in steam cmd.');
            if (!await this.validateValheim()) throw new Error('Unable to locate the valheim_server file.');
            return true;
        } catch (err) {
            this.manager.logger.error(`There was an error while attempting to install the valheim dedicated server.\n${err}`, true);
            return false;    
        }
    }

}


/**
 * Downloads a file from the specified web address.
 * @param {String} url - The source of the file to download.
 * @param {String} destination -The local destination to save the file.
 */
function promiseDownload(url, destination) {
    return new Promise(function(resolve, reject) {

        // Create the write stream and resolve on finish
        const file = fs.createWriteStream(destination);
        file.on('finish', () => file.close(resolve));

        // Setup the request, piping response to file and reject on error
        const req = https.get(url, res => res.pipe(file));
        req.on('error', err => reject(err));

        // Send the request
        req.end();
    });
}


/**
 * Extracts a zip file and resolves an empty promise. 
 * @param {String} file - The path of the archive to unzip.
 * @param {String} destination - Te location to extract the files to. 
 */
function promiseUnzip(file, destination) {
    return new Promise(function(resolve, reject) {
        let archive = new zip(file);
        archive.extractAllToAsync(destination, true, err => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}


/**
 * Executes the provided command and resolves a promise with the output.
 * Errors are stderr messages cause the promise to be rejected. 
 * @param {String} command - The command to execute.
 * @returns {Promise<String>} - The command output.
 */
function promiseExecute(command) {
    return new Promise(function(resolve, reject) {
        execute(command, function(error, stdout, stderr) {
            if (error) reject(error);
            if (stderr) reject(stderr);
            resolve(stdout);
        });
    });
}
