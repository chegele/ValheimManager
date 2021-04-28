
const os = require('os');
const fs = require('fs-extra');
const path = require('path');

module.exports = class ValheimFileManager {
    
    /** @param {Manager} manager */
    constructor(manager) {

        const onWindows = manager.config.manager.operatingSystem == 'win32';
        const fileDir = path.join(os.homedir(), onWindows ? 'AppData/LocalLow/IronGate/Valheim/' : '.config/unity3d/IronGate/Valheim/');

        this.manager = manager;
        this.adminPath = path.join(fileDir, 'adminlist.txt');
        this.bannedPath = path.join(fileDir, 'bannedlist.txt');
        this.permittedPath = path.join(fileDir, 'permittedlist.txt');
        this.valFiles = [this.adminPath, this.bannedPath, this.permittedPath];
        this.configPath = path.resolve(manager.config.manager.configLocation);

    }


    /**
     * Gets a list of ids from the provided valheim file.
     * @param {String} valFilePath 
     * @returns {String[]}
     */
    async getIdsFrom(valFilePath) {
        try {
            if (!this.valFiles.includes(valFilePath)) throw new Error('A valid valheim file path was not provided.');
            const file = await fs.readFile(valFilePath);
            const lines = file.toString().split(/\r?\n/);
            const ids = [];
            for (let i=0; i < lines.length; i++) {
                lines[i] = lines[i].trim();
                if (lines[i].startsWith('//')) continue;
                if (lines[i] == '') continue;
                ids.push(lines[i]);
            }
            return ids;
        } catch (err) {
            this.manager.logger.error(`Error getting ids from ${valFilePath} \n${err}`);
        }
    }


    /**
     * Adds an id to the provided valheim file.
     * @param {String} valFilePath 
     * @param {String} id 
     */
    async addIdTo(valFilePath, id) {
        try {
            if (!this.valFiles.includes(valFilePath)) throw new Error('A valid valheim file path was not provided.');
            if (typeof(id) != 'string') throw new Error('A valid id was not provided.');
            const ids = await this.getAdminIds();
            if (ids.includes(id)) return;
            const file = await fs.readFile(valFilePath);
            await fs.writeFile(valFilePath, file.toString() + `\n${id}`);
            return true;
        } catch (err) {
            this.manager.logger.error(`Error adding ${id} to ${valFilePath} \n${err}`);
            return false;
        }
    }


    /**
     * Removes an id from the provided valheim file.
     * @param {String} valFilePath 
     * @param {String} id 
     */
    async removeIdFrom(valFilePath, id) {
        try {
            if (!this.valFiles.includes(valFilePath)) throw new Error('A valid valheim file path was not provided.');
            if (typeof(id) != 'string') throw new Error('A valid id was not provided.');
            const file = await fs.readFile(valFilePath);
            const lines = file.toString().split(/\r?\n/);
            for (let i=0; i < lines.length; i++) {
                if (lines[i].trim() == id) {
                    lines.splice(i, 1);
                    await fs.writeFile(valFilePath, lines.join('\n'));
                    return true;
                }
            }
        } catch (err) {
            this.manager.logger.error(`Error removing ${id} from ${valFilePath} \n${err}`);
            return false;
        }
    }


    /**
     * Retrieves the value of a property from the saved configuration.
     * @param {String} property - The dot notation path to the property. 
     * @returns {*} The properties value
     */
    async getConfigValue(property) {
        try {
            if (!property.includes('.') || typeof(property) != 'string') throw new Error('A valid property was not provided.');
            const file = await fs.readFile(this.configPath);
            let result = JSON.parse(file);
            const structure = property.split('.');
            for (const piece of structure) result = result[piece]; 
            return result;
        } catch(err) {
            this.manager.logger.error(`Error reading configuration value for ${property} \n${err}`);
            return undefined;
        }
    }


    /**
     * Sets and saves a property to the configuration file.
     * @param {String} property - The dot notation path to the property.
     * @param {*} value The value to set the property to.
     */
    async setConfigValue(property, value) {
        try {
            if (!property.includes('.') || typeof(property) != 'string') throw new Error('A valid property was not provided.');
            const file = await fs.readFile(this.configPath);
            let config = JSON.parse(file);
            let prop = config;
            const structure = property.split('.');
            for (let i = 0; i < structure.length; i++) {
                if (i == structure.length - 1) {
                    prop[structure[i]] = value;
                } else {
                    if (prop[structure[i]] == undefined) throw new Error('This property does not exist. You must manually add it before it can be set.');
                    prop = prop[structure[i]];
                }
            }
            await fs.writeFile(this.configPath, JSON.stringify(config, undefined, 2));
            return true;
        } catch(err) {
            this.manager.logger.error(`Error updating configuration value for ${property} to ${value}\n${err}`);
            return false;
        }
    }


    // Expose simplified functions for working with each valheim file
    async getAdminIds() { return await this.getIdsFrom(this.adminPath) }
    async addAdminId(id) { return await this.addIdTo(this.adminPath, id) }
    async removeAdminId(id) { return await this.removeIdFrom(this.adminPath, id) }

    async getPermittedIds() { return await this.getIdsFrom(this.permittedPath) }
    async addPermittedId(id) { return await this.addIdTo(this.permittedPath, id) }
    async removePermittedId(id) { return await this.removeIdFrom(this.permittedPath, id) }

    async getBannedIds() { return await this.getIdsFrom(this.bannedPath) }
    async addBannedId(id) { return await this.addIdTo(this.bannedPath, id) }
    async removeBannedId(id) { return await this.removeIdFrom(this.bannedPath, id) }

}