require('../types/typedef');


module.exports = class Command {

    /** @param {Manager} manager */
    constructor(manager) {
        this.manager = manager;
        this.name = "REPLACE ME";
        this.example = "REPLACE ME";
        this.description = "REPLACE ME";
        this.acknowledgment = "REPLACE ME";
        this.arguments = 0;
    }


    /**
     * Validates generic command conditions
     * @param {String[]} arguments - The command arguments 
     * @returns {String | null} - A string with error details or null if ok to execute
     */
    async validate(args) {

        // See if the user is asking for help
        if (args[0] && ['help', '-h', '--help'].includes(args[0].toLowerCase())) {
            return this.example + ' : ' + this.description;
        }

        // Validate the user is providing the correct number of arguments.
        if (args.length < this.arguments) {
            let example = '\nExample: ' + this.example;
            return ('You did not provide enough information to execute this command.' + example);
        } 

        // No errors found
        return null;
    }

    /**
     * Executes the users command
     * @param {String[]} args
     * @returns {String} A user friendly description of the results from this command. 
     */
    async execute(args) {
        throw new Error(`The ${this.name} command must override the execute function.`);
    }

}