require('./types/typedef');

const exec = require('child_process').exec;

module.exports = class SystemTools {
    
    
    /** @param {Manager} manager */
    constructor(manager) {

        this.manager = manager;

        if (manager.config.manager.operatingSystem == 'win32') {
            this.findProcess = this.findWindowsProcess;
        } else {
            this.findProcess = this.findLinuxProcess;
        }

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
     * Waits for the specified period of time
     * @param {Number} seconds - The length of time to wait
     * @returns {Promise<void} An empty promise
     */
    wait(seconds) { 
        return new Promise(function(resolve, reject) {
            setTimeout(resolve, seconds * 1000);
        });
    }
    
    
}

// npm i nat-puncher