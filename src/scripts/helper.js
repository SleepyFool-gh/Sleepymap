// ┬ ┬┌─┐┌─┐┌─┐┬ ┬┬
// │ │└─┐├┤ ├┤ │ ││
// └─┘└─┘└─┘└  └─┘┴─┘
// USEFUL   :   returns type
// usage    :
//      getType(input,level) => type
//
// lvl0 => typeof
// lvl1 => {...lvl0, []:"array", null:"null"}
// lvl2 => {...lvl1, "$var":"story variable", "_var":"temp variable"}
function getType(t_in,lvl) {
    lvl ??= 2;

    let t_out;
    t_out   = typeof t_in;

    if (lvl < 1) { return t_out }
    t_out   = Object.prototype.toString.call(t_in).slice(8, -1).toLowerCase();

    if (lvl < 2) { return t_out }
    t_out   = (t_out === "string") && (t_in.first() === "$")
                ? "story variable"
            : (t_out === "string") && (t_in.first() === "_")
                ? "temp variable"
            : t_out;
    return t_out
}
function checkType(t_in,t_list,lvl) {
    lvl ??= 2;

    const t_valid   = getType(t_list) === "array"
                        ? getType(t_list[0]) === "object"
                            ? t_list // if array of objects, set
                        : t_list.map(function(t) { return {type:t,exact:false} }) // if array of strings, create object
                    : [{type:t_list,exact:false}]; // otherwise create standalone array object wrapper

    let pass = false;
    for (const t of t_valid) {
        pass    = t.type === "any"
                    ? true // if type is any, auto pass
                : t.exact && (t.type === t_in)
                    ? true // if exact flag and type string matches input exactly
                : getType(t_in,lvl) === t.type
                    ? true // otherwise if type matches type input
                : false;
        // stop checking as soon as one true is found
        if (pass) { break }
    }
    const group = t_valid.map(t => `"${t.type}"`).join(" or ");

    return pass
}
function quoteType(t_list) {
    const quote = getType(t_list) === "array"
                    ? getType(t_list[0]) === "object"
                        ? t_list.map( t => `"${t.type}"`).join(" or ")
                    : t_list.map( t => `"${t}"`).join(" or ")
                : `"${t_list}"`;
    return quote
}


// ┬ ┬┌─┐┌─┐┌─┐┬ ┬┬
// │ │└─┐├┤ ├┤ │ ││
// └─┘└─┘└─┘└  └─┘┴─┘
// USEFUL   :   macro argument parser
// usage    :  
//      const template = {
//          key1: {
//              type: "string",
//              required: true,
//              key_omittable: true,
//          },
//          key2: {
//              type: ["number", "story variable"],
//          },
//      };
//      const argsObj = args_to_argsObj.call(this, args, template);
//
// valid keys   :   passage, linkText, [string]; DO NOT USE NUMBERS OR SYMBOLS
// valid types  :   any returnable from getType(*,2) + exact
function args_to_argsObj(args,template) {
    const keys  = Object.keys(template);
    const argsObj   = {};

    // flags for omittable keys
    const keys_omittable = keys.filter( k => template[k].omittable );
    let skip = keys_omittable.length === 0;

    for (let i = 0; i < args.length; i++) {
        console.log(i);
        const arg_i = args[i];
        const key_i = keys[i];
        const arg_n = args[i+1];
        
        // return error if given passage link object macro & does not call for it, exit
        if (
            (arg_i.isLink) && 
            (! keys.includes('passage'))
        ) {
            return this.error("macro does not accept [[markup]]");
        }

        // check omittable
        skip    = skip
                    ? true  // if skipping, keep skipping
                : keys.includes(arg_i)
                    ? true  // if this arg is key name, start skipping
                : (getType(arg_i) === 'object') && (! checkType(arg_i,template[key_i].type))
                    ? true  // if object and omittable at this index does not take objects, start skipping
                : ! template[key_i].omittable
                    ? true // at index past omittable keys
                : false;

        if (! skip) {
            // if wrong type, throw error
            if (! checkType(arg_i,template[key_i].type)) {
                return this.error(`wrong type for "${key_i}", expected ${quoteType(template[key_i].type)}, received "${getType(arg_i)}"`)
            }
            // otherwise write and skip to next loop
            else {
                argsObj[key_i] = arg_i;
                continue;
            }
        }

        // if [[markup]], write and skip to next loop
        if (arg_i.isLink) {
            argsObj.linkText = arg_i.text;
            argsObj.passage  = arg_i.link;
            continue;
        }

        console.log(arg_i);
        // if generic object, parse and skip to next loop
        if ((getType(arg_i) === 'object')) {
            for (const k in arg_i) {
                console.log(k);
                // if no this k in keys, skip
                if (! keys.includes(k)) {
                    continue;
                }
                // if wrong type, throw error
                if (! checkType(arg_i[k],template[k].type)) {
                    return this.error(`wrong type for "${k}", expected ${quoteType(template[k].type)}, received "${getType(arg_i[k])}"`)
                }
                argsObj[k] = arg_i[k];
            }
            continue;
        }

        // if anything else, then this + next should be KVP
        // return error if not key name
        if (! keys.includes(arg_i)) {
            return this.error(`argument name expected, but received "${arg_i}"`)
        }
        // if no value for argument
        if (getType(arg_n) === 'undefined') {
            return this.error(`missing expected value for "${arg_i}"`)
        }
        // if wrong type, error
        if (! checkType(arg_n,template[arg_i].type)) {
            return this.error(`wrong type for "${arg_i}", expected ${quoteType(template[arg_i].type)}, received "${getType(arg_i)}"`)
        }
        
        // write then hop one
        argsObj[arg_i] = arg_n;
        i++;
    };


    // check if final object has required keys
    const keys_required = keys.filter(k => template[k].required);
    for (const k of keys_required) {
        if (! Object.keys(argsObj).includes(k)) {
            return this.error(`missing required key, "${k}"`)
        }
    } 

    return argsObj

}