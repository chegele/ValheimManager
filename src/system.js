require('./types/typedef');

const exec = require('child_process').exec;
const path = require('path');
const https = require('https');
const fs = require('fs-extra');
const admZip = require('adm-zip');
const osUtils = require('os-utils');
const nat = require('nat-puncher');

module.exports = class SystemTools {
    
    
    /** @param {Manager} manager */
    constructor(manager) {

        this.manager = manager;
        this.gamePort = manager.config.launcher.port;

        if (manager.config.manager.operatingSystem == 'win32') {
            this.findProcess = this.findWindowsProcess;
        } else {
            this.findProcess = this.findLinuxProcess;
        }

    }


    /**
     * Checks the current cpu use
     */
    cpuStats() {
        const system = this;
        return new Promise(function(resolve, reject) {
            osUtils.cpuUsage(use => {
                const stats = {
                    percentUse: Math.round(use * 100),
                    cores: osUtils.cpuCount()
                }
                system.manager.logger.detail(`CPU stats checked - ${stats.percentUse}% used with ${stats.cores} cores.`);
                resolve(stats);
            })
        });
    }


    /**
     * Checks the current memory use
     */
    memoryStats() {
        const total = Math.round(osUtils.totalmem());
        const percentUse = Math.round(100 - (osUtils.freememPercentage() * 100));
        this.manager.logger.detail(`Memory stats checked - ${percentUse}% of ${total}MB used.`);
        return {percentUse, total};
    }


    /**
     * Finds a windows process with text matching a provided search
     * @param {String} search The string to match against the running processes
     * @returns {SystemProcess | null}
     */
    async findLinuxProcess(search) {
        const command = 'ps -ef';
        const running = await this.execute(command);
        for (const line of running.split('\n')) {
            if (line.includes(search)) {
                const segments = line.split(/\s+/);
                const pid = segments[1];
                const name = segments.slice(7).join(' ');
                return {pid, name};
            }
        }
        return null;
    }


    /**
     * Finds a windows process with text matching a provided search
     * @param {String} search The string to match against the running processes
     * @returns {SystemProcess | null}
     */
    async findWindowsProcess(search) {
        const command = 'tasklist';
        const running = await this.execute(command);
        for (const line of running.split('\n')) {
            if (line.includes(search)) {
                const segments = line.split(/\s+/);
                const pid = segments[1];
                const name = segments[0]
                return {pid, name};
            }
        }
        return null;
    }
    

    /**
     * Executes the provided command and resolves a promise with the output.
     * Errors are stderr messages cause the promise to be rejected. 
     * @param {String} command - The command to execute.
     * @returns {Promise<String>} - The command output.
     */
    execute(command) {
        return new Promise(function(resolve, reject) {
            exec(command, function(error, stdout, stderr) {
                if (error) reject(error);
                if (stderr) reject(stderr);
                resolve(stdout);
            });
        });
    }


    /**
     * Creates a zip archive and resolves an empty promise.
     * @param {String[]} files - The files to be included in the archive.
     * @param {String} destination - The location of save the file.
     * @returns 
     */
    zip(files, destination) {
        return new Promise(function(resolve, reject) {
            const archive = new admZip();
            for (const file of files) archive.addLocalFile(file);
            archive.writeZip(destination, err => {
                if (err) return reject(err);
                resolve();
            })
        });
    }


    /**
     * Extracts a zip file and resolves an empty promise. 
     * @param {String} file - The path of the archive to unzip.
     * @param {String} destination - The location to extract the files to. 
     */
    unzip(file, destination) {
        return new Promise(function(resolve, reject) {
            const archive = new admZip(file);
            archive.extractAllToAsync(destination, true, err => {
                if (err) return reject(err);
                resolve();
            });
        });
    }


    /**
     * Waits for the specified period of time
     * @param {Number} seconds - The length of time to wait
     * @returns {Promise<void} An empty promise
     */
    wait(seconds) { 
        return new Promise(function(resolve, reject) {
            setTimeout(resolve, seconds * 1000);
        });
    }


    /**
     * Checks for active upnp services on the router
     */
    async checkNatSupport() {
        return await nat.probeProtocolSupport();
    }


    /**
     * Checks for current port maps utilizing upnp
     */
    async getPortMaps() {
        return await nat.getActiveMappings();
    }


    /**
     * Attempts to create a new port mapping
     * @param {Number} internal - The internal port (local machine)
     * @param {Number} external - The external port (internet addressable)
     * @param {Number} seconds - The number of seconds to keep the port open. 0 will refresh the mapping every hour
     */
    async addPortMap(internal, external, seconds) {
        return await nat.addMapping(internal, external, seconds);
    }


    /**
     * Attempts to remove a port mapping
     * @param {Number} external - The external port to close 
     */
    async removePortMappings(external) {
        return await nat.deleteMapping(external);
    }


    /**
     * Attempts to automatically open all three server ports
     * @returns {Boolean} true on success or an error will be thrown with failure details
     */
    async autoOpenServerPorts() {
        const ports = [this.gamePort, this.gamePort + 1, this.gamePort + 2];
        this.manager.logger.general(`Attempting to open ports ${ports.toString()}...`);
        const protocols = await this.checkNatSupport();
        if (!protocols.natPmp && !protocols.pcp && !protocols.upnp) {
            this.manager.logger.warning('Unable to automatically open ports. All upnp protocols are disabled on your router.');
            throw new Error('Unable to automatically open ports.');
        }
        for (const port of ports) {
            let result = await this.addPortMap(port, port, 0);
            if (!result) {
                this.manager.logger.warning('Failed to open port ' + port);
                throw new Error('Failed to open port ' + port);
            }
        }
        this.manager.logger.general('Successfully opened the ports.');
        return true;
    }


    /**
     * Attempts to automatically close all of the server ports
     * @returns {Boolean} true on success or an error with throw with failure details
     */
    async autoCloseServerPorts() {
        const ports = [this.gamePort, this.gamePort + 1, this.gamePort + 2];
        this.manager.logger.general(`Attempting to close ports ${ports.toString()}...`);
        let failed = [];
        for (const port of ports) {
            let result = await this.removePortMappings(port);
            if (!result) failed.push(port);
        }
        if (failed.length > 0) {
            this.manager.logger.warning('Failed to close port(s) ' + failed.toString());
            throw new Error('Failed to close port(s) ' + failed.toString());
        }
        this.manager.logger.general('Successfully closed the ports.');
        return true;
    }


    /**
     * Reads the applications version from the package.json file.
     */
    async readLocalVersion() {
        let file = path.join(__dirname, '../package.json');
        let appPackage = await fs.readFile(file);
        return JSON.parse(appPackage).version;
    }


    /**
     * Reads the applications version from the git repository.
     */
    async readRemoteVersion() {
        let url = `https://raw.githubusercontent.com/chegele/ValheimManager/master/package.json`;
        try {
            let body = await this.promiseHttpsRequest(url);
            let remotePackage = JSON.parse(body);
            let version = remotePackage.version;
            return version;
        }catch(err) {
            this.manager.logger.error('Failed to read the the remote version of Valheim Manager.\n' + err.stack);
            return null;
        }
    }


    /**
     * A promise wrapper for sending a get https requests.
     * @param {String} url - The Https address to request.
     * @param {String} options - The request options. 
     */
    promiseHttpsRequest(url, options = {}) {
        return new Promise(function(resolve, reject) {
            const req = https.request(url, options, res => {
                let body = '';
                res.on('data', data => {body += data});
                res.on('end', function() {
                    if (res.statusCode == '200') return resolve(body);
                    reject(res.statusCode);
                });
            });
            req.on('error', reject);
            req.end();
        }); 
    }


    /**
     * Downloads a file from the specified web address.
     * @param {String} url - The source of the file to download.
     * @param {String} destination -The local destination to save the file.
     */
    promiseDownload(url, destination) {
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
    
    
}
