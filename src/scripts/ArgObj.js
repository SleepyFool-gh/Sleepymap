//  ███  ████   ███   ████  ████      █
// █   █ █   █ █     █    █ █   █     █
// █████ ████  █  ██ █    █ ████      █
// █   █ █   █ █   █ █    █ █   █ █   █
// █   █ █   █  ███   ████  ████   ███
// SECTION: ArgObj
// DESCRIPTION:
// Converts an array of arguments into argument object based off a provided template. Uses the first argument as a key name and the next as the value, but will also accept prefilled generic object and extract valid kvp's from it.
//
// EXAMPLE:
//      const template = {
//          npc: {                  // key name
//              required: true,     // whether the key is required
//              type: "string",     // what types are accepted for value, uses typeof
//              aliases: "char",    // other acceptable names for the key
//                                  // both type & aliases get turned into arrays if not already one
//          },
//      },
//      const argObj    = new ArgObj("xlink", template, args_in);
//
//////////////////////////////////////////////////
class ArgObj {

    #ctx; // private field that stores data passed between methods

    /**
     * Creates an argument object from the this.args of a SugarCube macro
     * @param {string} id - id, used for error codes
     * @param {Object} template - template dictating structure of arguments
     * @param {Object} template.key - first key to be checked for
     * @param {string|string[]} [template.key.type] - accepted data types for key, uses typeof
     * @param {string|string[]} [template.key.aliases] - alternate names for key
     */
    constructor(id, template, args_in) {

        //////////////////////////////////////////////////
        // ERROR: invalid id — undefined, not a string, not empty string
        if (
            (typeof id !== 'string') || 
            (id.length === 0)
        ) {
            throw new Error(`ArgObj — invalid id "${id}", should be a string; FAILED`)
        }
        // ERROR: invalid template — undefined, not an object, or an empty object
        else if (
            (typeof template !== 'object') || 
            (Object.keys(template).length === 0)
        ) {
            throw new Error(`ArgObj — invalid template "${template}", should be a non-empty object; FAILED`)
        }
        // ERROR: invalid args_in — undefined or not an array
        else if (! Array.isArray(args_in)) {
            throw new Error(`ArgObj — invalid args_in "${args_in}", should be an array; FAILED`)
        }
        // WARNING: empty args_in
        else if (args_in.length === 0) {
            console.warn(`${id} — ArgObj "args_in" is empty, no args to parse; ABORTED`);
            return this;
        }
        const keys = Object.keys(template);

        //////////////////////////////////////////////////
        // create aliases object
        const aliases = {};
        try {
            for (const k of keys) {
                // add own name first
                aliases[k] = k;
                // if no aliases, skip
                if (template[k].aliases === undefined) {
                    continue;
                }
                // wrap aliases in an array if not in one
                const arr   = Array.isArray(template[k].aliases)
                                ? template[k].aliases
                                : [template[k].aliases];
                for (const a of arr) {
                    // ERROR: aliases wasn't a string or an array of strings
                    if (typeof a !== 'string') {
                        throw new Error(`${id} — ArgObj failed, aliases should be a string or an array of strings; FAILED`)
                    }
                    // ERROR: clobbering existing alias
                    if (aliases[a] !== undefined) {
                        throw new Error(`${id} — ArgObj failed, clobbering existing name/aliases "${a}"; FAILED`)
                    }
                    aliases[a] = k;
                }
            }
        }
        catch (error) {
            console.error(`${id} — ArgObj failed to parse aliases`);
            throw error;
        }
        
        // save vars to #ctx
        this.#ctx = {id, template, args_in, keys, aliases};

        // go through every arg
        let i = 0;
        try {
            while (i < args_in.length) {
                const arg_this = args_in[i];
                const key_this = aliases[arg_this];
                // {object} input
                if (typeof arg_this === 'object') {
                    i += this.#parse_obj(i);
                }
                // kvp input
                else if (key_this !== undefined) {
                    i += this.#parse_kvp(i);
                }
                // ERROR: unknown input, author error
                else {
                    throw new Error(`${id} — macro input parsing failed, unknown input "${arg_this}"; FAILED`);
                }
            }
        }
        catch (error) {
            console.error(`${id} — ArgObj failed to parse arguments`);
            throw error;
        }
    }

    // parse {object} input
    #parse_obj(i) {
        const { id, args_in, aliases } = this.#ctx;
        const arg_this = args_in[i];
        try {
            for (const k in arg_this) {
                const key_this = aliases[k];
                const val_this = arg_this[k];
                // WARNING: template doesn't contain key, author error
                if (key_this === undefined) {
                    console.warn(`${id} — macro input parser can't identify key "${k}" or any aliases for it; IGNORED`);
                    continue;
                }
                // write value
                this.#write_value(key_this, val_this);
            }
            // i increments by 1
            return 1;
        }
        catch (error) {
            console.error(`${id} — ArgObj failed to parse {object} input at ${arg_this}`);
            throw error;
        }
    }
    // parse key value pairs
    #parse_kvp(i) {
        const { id, args_in, aliases } = this.#ctx;
        const arg_this = args_in[i];
        const key_this = aliases[arg_this];
        const val_this = args_in[i + 1];
        try {
            // ERROR: undefined input for key, author error
            if (args_in.length <= i + 1) {
                throw new Error(`${id} — macro input parser couldn't pair key "${arg_this}" with any value (missing); FAILED`)
            }
            this.#write_value(key_this, val_this);
            // i increments by 1
            return 2;
        }
        catch (error) {
            console.error(`${id} — ArgObj failed to parse key value pair at "${arg_this}"`);
            throw error;
        }
    }
    // write value, ie. create property on ArgObj instance
    #write_value(key_this, val_this) {
        const { id, template } = this.#ctx;
        // WARNING: clobbering, author warning
        if (this[key_this] !== undefined) {
            console.warn(`${id} — macro input parser clobbered key "${key_this}" previous val "${this[key_this]}" with new val "${val_this}"; CLOBBERED`);
        }
        // write values
        this[key_this] = val_this;
    }

    /**
     * Validate argObj's against templates
     * @param {string} id - macro id
     * @param {object} template - template to validate against
     * @param {object} argObj - argObj to validate
     * @returns {boolean} - true if valid, false if not
     */
    static validate(id, template, argObj) {
        // iterate through all provided keys
        for (const key in argObj) {
            const val = argObj[key];
            // WARNING: unexpected key, ignored
            if (! Object.keys(template).includes(key)) {
                console.warn(`${id} — received unexpected key "${key}", ignored...`);
                continue;
            }

            // only check types if provided
            if (template[key].type !== undefined) {
                // convert types to array
                const typeArr   = Array.isArray(template[key].type) 
                                    ? template[key].type 
                                    : [template[key].type];
                // ERROR: failed type validation, author error
                if (! typeArr.includes(typeof val)) {
                    throw new Error(`${id} — macro input parser failed to parse key value pair at key "${key}", "${val}" is an invalid type ("${typeof val}"), expected ${typeArr.toString()}; FAILED`);
                }
            }
        }
        
        // check all required keys were provided
        const keys_required = Object.keys(template).filter(k => template[k].required);
        for (const key of keys_required) {
            // ERROR: missing required key, author error
            if (! (key in argObj)) {
                throw new Error(`${id} — required key "${key}" not provided`);
            }
        }
    }
    add_metadata(key, val) {
        Object.defineProperty(this, key, {
            value: val,
            configurable: true,
            enumerable: false,
            writable: true,
        });
    }
}