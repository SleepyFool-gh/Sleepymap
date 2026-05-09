(() => {

//  ████  ████  █████ ███  ████  █    █  ████
// █    █ █   █   █    █  █    █ ██   █ █
// █    █ ████    █    █  █    █ █ █  █  ███
// █    █ █       █    █  █    █ █  █ █     █
//  ████  █       █   ███  ████  █   ██ ████
// SECTION: options & other global constants

const options = {
    default: {
        wall_id                 : '.',
        diagonals               : false,
        position_story_variable : '$@Sleepymap/position',
        autoupdate_rose         : true,
        autoupdate_mapview      : true,
        clickable_mapview       : true,
        show_labels_on_mapview  : true,
    },
    labels: {
        N   : "🡱",
        E   : "🡲",
        S   : "🡳",
        W   : "🡰",
        NE  : "🡵",
        SE  : "🡶",
        SW  : "🡷",
        NW  : "🡴",
    },
    // THIS IS REGEX MAGIC. MANIPULTE AT YOUR OWN RISK.
    barriers: {
        N       : /"/,                                          // match " character somewhere
        E       : /(?<=[a-zA-Z0-9][^\s]*)\|(?![a-zA-Z0-9])/,    // match | character on right side -->
        S       : /_/,                                          // match _ character somewhere
        W       : /(?<![a-zA-Z0-9])\|(?=[^\s]*[a-zA-Z0-9])/,    // match | character on <-- left side
        NE      : /(?<=[a-zA-Z0-9][^\s]*)\\(?![a-zA-Z0-9])/,    // match \ character on right side -->
        SE      : /(?<=[a-zA-Z0-9][^\s]*)\/(?![a-zA-Z0-9])/,    // match / character on right side -->
        SW      : /(?<![a-zA-Z0-9])\\(?=[^\s]*[a-zA-Z0-9])/,    // match \ character on <-- left side
        NW      : /(?<![a-zA-Z0-9])\/(?=[^\s]*[a-zA-Z0-9])/,    // match / character on <-- left side
        replace : /[\/\\|_"]/g,                                 // remove " | _ \ / characters to get node id
    }
}
setup['@Sleepymap/options'] = options;

// maps container
const maps = {};
// used in update_exits
const RECIPROCALS = {
    N: 'S',
    S: 'N',
    E: 'W',
    W: 'E',
    NE: 'SW',
    SE: 'NW',
    SW: 'NE',
    NW: 'SE',
};
// used in update_exits
// SYNC REMINDER: rose doesn't use this to generate keys
const is_diagonal = {
    N   : false,
    E   : false,
    S   : false,
    W   : false,
    NE  : true,
    SE  : true,
    SW  : true,
    NW  : true,
};


// █    █ █████ █     █     █    █  ███  ████
// ██   █ █     █     █     ██  ██ █   █ █   █
// █ █  █ ███   █  █  █     █ ██ █ █████ ████
// █  █ █ █     █ █ █ █     █    █ █   █ █
// █   ██ █████  █   █      █    █ █   █ █
// SECTION: new_map function & macro wrapper
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants

const NEW_MAP_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    grid_movement: {
        type: 'boolean',
        aliases: 'grid_mode',
    },
    start: {
        type: 'string',
    },
    start_x: {
        type: 'number',
    },
    start_y: {
        type: 'number',
    },
    columns: {
        required: true,
        type: 'number',
    },
    diagonals: {
        type: 'boolean',
    },
    // JS properties
    maparray: {
        type: 'object',
    },
    mapview: {
        type: 'object',
    },
    mapvars: {
        type: 'object',
    },
    mapnodes: {
        type: 'object',
    },
};
const MAPVIEW_TEMPLATE = {
    columns: {
        required: true,
        type: 'number',
    },
};
// SYNC REMINDER: changing here also requires changing MAPVAR_DEFAULTS
const MAPVARS_TEMPLATE = {
    position: {
        required: true,
        type: 'string',
    },
    frozen: {
        type: 'string',
    },
    disabled: {
        type: 'string',
    },
    hidden: {
        type: 'string',
    },
    blocked: {
        type: 'string',
    },
};
// macro wrapper for new_map
Macro.add(['newmap', 'new_map'], {

    tags: ['mapview', 'mapvars', 'mapnodes'],

    handler() {

        const name = this.name;

        // ERROR: macro being called outside StoryInit
        if (turns() !== 0) {
            throw new Error(`${name} — Sleepymap — macro must be called during StoryInit!`);
        }

        // create argObj from NEW_MAP_TEMPLATE
        const argObj = new ArgObj(name, NEW_MAP_TEMPLATE, this.args);

        // create map array from payload
        argObj.maparray = this.payload[0].contents.trim().split(/\s+/g);

        // if <<mapview>> exists
        const mapview_payload = this.payload.find( p => p.name === 'mapview' );
        if (mapview_payload) {
            const args = mapview_payload.args;
            const mapview_argObj = new ArgObj(name, MAPVIEW_TEMPLATE, args);
            argObj.mapview = {
                columns: mapview_argObj.columns,
                array: mapview_payload.contents.trim().split(/\s+/g),
            };
        }

        // if <<mapnodes>> exists
        // should be an object of values to write into the node data when nodes are being generated
        const mapnodes = this.payload.find( p => p.name === 'mapnodes' )?.args[0]
        if (mapnodes) {
            argObj.mapnodes = mapnodes;
        }

        // if <<mapvars>> exists
        const mapvars_payload = this.payload.find( p => p.name === 'mapvars' );
        if (mapvars_payload) {
            const args = mapvars_payload.args;
            const mapvars_argObj = new ArgObj('mapvars', MAPVARS_TEMPLATE, args);
            argObj.mapvars = mapvars_argObj;
        }

        argObj.add_metadata('name', name);
        new_map(argObj);
    },
});

// creates map object on the new_map macro
function new_map(argObj) {


//     ███ █    █ ███ █████     █    █  ███  ████
//      █  ██   █  █    █       ██  ██ █   █ █   █
//      █  █ █  █  █    █       █ ██ █ █████ ████
//      █  █  █ █  █    █       █    █ █   █ █
//     ███ █   ██ ███   █       █    █ █   █ █
//      SECTION: init the map
//      creates map object on the new_map macro

    const name = argObj.name ?? 'Sleepymap.new_map';

    // VALIDATE: required args & type
    ArgObj.validate(name, NEW_MAP_TEMPLATE, argObj);
    
    // extract out vars that don't need processing
    // maparray, mapnodes, mapvars need processing
    const { mapname, grid_movement, start, start_x, start_y, columns, mapview } = argObj;
    const diagonals = argObj.diagonals ?? options.default.diagonals;    // default value

    // BASIC ERRORS
    // ERROR: map with name already exists
    if (maps[mapname]) {
        throw new Error(`${name} — Sleepymap — map with name "${mapname}" already exists!`);
    }

    // MAPARRAY & START ERRORS
    // ERROR: maparray not an array (or undefined)
    if (! Array.isArray(argObj.maparray)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — maparray must be an array!`);
    }
    // ERROR: maparray not rectangular
    else if (argObj.maparray.length % columns !== 0) {
        throw new Error(`${name} — Sleepymap "${mapname}" — maparray must be rectangular (whole number multiple of columns)!`);
    }
    // ERROR: grid movement with wrong start arg
    else if (grid_movement && (start !== undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — "start" arg is only for node movement mode!`);
    }
    // ERROR: node movement with wrong start args
    else if ((! grid_movement) && ((start_x !== undefined) || (start_y !== undefined))) {
        throw new Error(`${name} — Sleepymap "${mapname}" — "start_x" and "start_y" args are only for grid movement mode!`);
    }
    // ERROR: node map mode, invalid start
    else if ((! grid_movement) && (! argObj.maparray.includes(start))) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start mapnode "${start}" not found in maparray!`);
    }
    // ERROR: start_x and start_y required for gridmap mode
    else if (grid_movement && (start_x === undefined || start_y === undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start_x and start_y required for gridmap mode!`);
    }
    // VALIDATE: xy bounds
    else if (grid_movement) {
        validate_bounds({ 
            name, 
            mapname, 
            columns, 
            maparray: argObj.maparray, 
            x: start_x, 
            y: start_y 
        });
    }

    // MAPVIEW ERRORS
    if (mapview !== undefined) {
        // ERROR: mapview not an object
        if (typeof mapview !== 'object') {
            throw new Error(`${name} — Sleepymap — mapview must be an object!`);
        }
        // VALIDATE: required args & type
        ArgObj.validate(name, MAPVIEW_TEMPLATE, mapview);
        // ERROR: mapview.array not an array (or undefined)
        if (! Array.isArray(mapview.array)) {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview.array must be an array!`);
        }
        // ERROR: grid movement is incompatible with separate mapview
        else if (grid_movement && mapview) {
            throw new Error(`${name} — Sleepymap "${mapname}" — grid movement is incompatible with a separate mapview!`);
        }
        // ERROR: mapview.array not rectangular
        else if (mapview.array.length % mapview.columns !== 0) {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview.array must be rectangular (whole number multiple of mapview.columns)!`);
        }
        // WARNING: empty mapview.array
        if (mapview.array.length === 0) {
            console.warn(`${name} — Sleepymap "${mapname}" — mapview.array is empty!`);
        }
    }

    // MAPNODE ERRORS
    // ERROR: mapnodes not an object
    if ((argObj.mapnodes !== undefined) && (typeof argObj.mapnodes !== 'object')) {
        throw new Error(`${name} — Sleepymap — mapnodes must be an object!`);
    }

    // MAPVAR ERRORS
    if (argObj.mapvars !== undefined) {
        // ERROR: mapvars not an object
        if (typeof argObj.mapvars !== 'object') {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapvars not an object!`);
        }
        // VALIDATE: required args & type
        ArgObj.validate(name, MAPVARS_TEMPLATE, argObj.mapvars);
    }

    // create map object
    const this_map = {
        mapname,
        columns,
        diagonals,
        grid_movement,
        mapview,
        maparray    : [],           // populated here, later
        barriers    : [],           // populated here, later
        mapnodes    : {},           // populated here, later
        mapvars     : {},           // populated here, later
        exits       : {             // populated here, later
            node    : {},
            grid    : [],
        },
        scripts     : [],           // populated in set_scripts, if called
        entities    : {},           // populated in set_entity, if called
    };
    maps[mapname] = this_map;


//     █    █  ███  ████   ███  ████  ████   ███  █   █
//     ██  ██ █   █ █   █ █   █ █   █ █   █ █   █  █ █
//     █ ██ █ █████ ████  █████ ████  ████  █████   █
//     █    █ █   █ █     █   █ █   █ █   █ █   █   █
//     █    █ █   █ █     █   █ █   █ █   █ █   █   █
//      SECTION: maparray & barriers

    const maparray = [];
    const barriers = [];
    for (const cell of argObj.maparray) {
        const barrier = {
            N   : options.barriers.N.test(cell),
            E   : options.barriers.E.test(cell),
            S   : options.barriers.S.test(cell),
            W   : options.barriers.W.test(cell),
            NE  : options.barriers.NE.test(cell),
            SE  : options.barriers.SE.test(cell),
            SW  : options.barriers.SW.test(cell),
            NW  : options.barriers.NW.test(cell),
        }
        barriers.push(barrier);
        maparray.push(cell.replace(options.barriers.replace, ''));
    }
    this_map.maparray = maparray;
    this_map.barriers = barriers;


//     █    █  ███  ████   ███  ████  █████  ███   ████
//     ██  ██ █   █ █   █ █   █ █   █ █     █   █ █
//     █ ██ █ █████ ████  █████ ████  ███   █████  ███
//     █    █ █   █ █     █   █ █   █ █     █   █     █
//     █    █ █   █ █     █   █ █   █ █████ █   █ ████
//      SECTION: mapnodes
//      creates nodes based off any provided data & off the defaults
//      node, here, means a named region on the map represented by an id

    // create mapnodes
    const mapnodes = this_map.mapnodes;
    // take unique values from map array, create nodes for each
    [...new Set(maparray)].forEach( function(id) {
        // SYNC REMINDER: changing here also requires changing default wall below & edit_map fn
        mapnodes[id] = {
            id      : id,                                       // node identifier
            name    : argObj.mapnodes?.[id]?.name ?? id,        // name, use mapnode name if found
            type    : argObj.mapnodes?.[id]?.type ?? 'floor',   // type, use mapnode type if found
            tile    : argObj.mapnodes?.[id]?.tile ?? undefined, // tile, use mapnode tile if found
        };
    });
    // overwrite with default wall
    {
        const id = options.default.wall_id;
        // SYNC REMINDER: changing here also requires changing forEach ^ & edit_map fn
        mapnodes[id] = {
            id      : id,
            name    : argObj.mapnodes?.[id]?.name ?? id,
            type    : argObj.mapnodes?.[id]?.type ?? 'wall',
            tile    : argObj.mapnodes?.[id]?.tile ?? undefined,
        };
    }


//     █    █  ███  ████  █   █  ███  ████   ████
//     ██  ██ █   █ █   █ █   █ █   █ █   █ █
//     █ ██ █ █████ ████  █   █ █████ ████   ███
//     █    █ █   █ █      █ █  █   █ █   █     █
//     █    █ █   █ █       █   █   █ █   █ ████
//      SECTION: mapvars
//      sets the State variables used to track position & the state of the links

    // create mapvars
    const mapvars = this_map.mapvars;

    // SYNC REMINDER: changing anything here also requires changing <<mapvars>> template
    const xy = { x: start_x, y: start_y };
    const mapnode = grid_movement ? maparray[xy2i({ xy, columns })] : start;
    const MAPVAR_DEFAULTS = {
        position: {
            sv_name : argObj?.mapvars?.position ?? options.default.position_story_variable,
            val     : grid_movement ? { mapname, mapnode, x: start_x, y: start_y } : { mapname, mapnode },
        },
        frozen: {
            sv_name : argObj?.mapvars?.frozen,
            val     : false,
        },
        disabled: {
            sv_name : argObj?.mapvars?.disabled,
            val     : Object.keys(mapnodes).reduce((obj, mapnode) => { obj[mapnode] = false; return obj; }, {}),
        },
        hidden: {
            sv_name : argObj?.mapvars?.hidden,
            val     : Object.keys(mapnodes).reduce((obj, mapnode) => { obj[mapnode] = false; return obj; }, {}),
        },
        blocked: {
            sv_name : argObj?.mapvars?.blocked,
            val     : Object.keys(mapnodes).reduce((obj, mapnode) => { obj[mapnode] = false; return obj; }, {}),
        },
    };
    for (const key of Object.keys(MAPVAR_DEFAULTS)) {
        const sv_name = MAPVAR_DEFAULTS[key].sv_name;
        // skip if mapvar not defined on argObj
        if (sv_name === undefined) {
            continue;
        }

        // ERROR: mapvar value is not a string
        if (typeof sv_name !== 'string') {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapvar only accepts strings, "${sv_name}" wasn't a string!`);
        }
        // ERROR: mapvar value is not a story variable
        else if (sv_name.first() !== '$') {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapvar "${sv_name}" isn't a story variable starting with "$"!`);
        }
        // WARNING: clobbering something
        if (State.variables[sv_name.slice(1)] !== undefined) {
            console.warn(`${name} — Sleepymap "${mapname}" — something was clobbered while setting mapvar "${key}" at "${sv_name}"!`);
        }

        // set default value
        // can't use State.setVar with weird characters
        mapvars[key] = sv_name;
        State.variables[sv_name.slice(1)] = MAPVAR_DEFAULTS[key].val;
    }
    

//   ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐─┐ ┬┬┌┬┐┌─┐
//   │ │├─┘ ││├─┤ │ ├┤   ├┤ ┌┴┬┘│ │ └─┐
//   └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘┴ └─┴ ┴ └─┘
//  SECTION: update exits object
    update_exits({ mapname });
}




// █████ █   █ ███ █████  ████
// █      █ █   █    █   █
// ███     █    █    █    ███
// █      █ █   █    █       █
// █████ █   █ ███   █   ████
// SECTION: map backbone, updates exits object
function update_exits(argObj) {
    const name = argObj.name ?? 'Sleepymap.update_exits';

    const { mapname } = argObj;
    const this_map = maps[mapname];

    // ERROR: mapname missing
    if (mapname === undefined) {
        throw new Error(`${name} — Sleepymap — mapname is required!`);
    }
    // ERROR: non-extant map
    else if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" does not exist!`);
    }

    const { maparray, barriers, mapnodes, columns, diagonals, exits } = this_map;

    // get offsets
    const offsets = get_offsets({ columns });

    // init exits
    exits.node = Object.fromEntries(Object.keys(mapnodes).map(id => [id, {}]));
    exits.grid = maparray.map( () => ({}) );
    exits.manual ??= [];
    // populate exits object
    for (let i = 0; i < maparray.length; i++) {

        // define checks for each direction
        const checks = {
            N   : i >= columns,
            E   : (i+1) % columns !== 0,
            S   : i < (maparray.length - columns),
            W   : i % columns !== 0,
            NE  : (i >= columns) && ((i+1) % columns !== 0),
            SE  : (i < (maparray.length - columns)) && ((i+1) % columns !== 0),
            SW  : (i < (maparray.length - columns)) && (i % columns !== 0),
            NW  : (i >= columns) && (i % columns !== 0),
        };

        const mapnode = mapnodes[maparray[i]];

        // this map node is a wall, no need to find exits
        if (mapnode.type === 'wall') {
            continue;
        }
        for (const [dir, check] of Object.entries(checks)) {
            // if check not needed, continue
            if (! check) {
                continue;
            }
            // if dir is a diagonal and diagonals not enabled, continue
            else if (is_diagonal[dir] && (! diagonals)) {
                continue;
            }

            // get neighbor
            // if wall, continue
            const neighbor = mapnodes[maparray[i + offsets[dir]]];
            if (neighbor.type === 'wall') {
                continue;
            }

            // if barrier exists between this cell & neighbor, skip
            if (barriers[i][dir] || barriers[i + offsets[dir]][RECIPROCALS[dir]]) {
                continue;
            }

            // node exits
            if (neighbor.id !== mapnode.id) {
                exits.node[mapnode.id][dir] ??= new Set();
                exits.node[mapnode.id][dir].add(neighbor.id);
            }
            // grid exits
            exits.grid[i][dir] ??= new Set();
            exits.grid[i][dir].add(i + offsets[dir]);
        }
    }

    // check manual exits
    for (const exit of exits.manual) {
        if (exit.grid_mode) {
            // VALIDATE: bounds
            validate_bounds({ name, mapname, columns, maparray, x: exit.from_x, y: exit.from_y });
            validate_bounds({ name, mapname, columns, maparray, x: exit.to_x, y: exit.to_y });

            const from_i    = xy2i({ xy: { x: exit.from_x, y: exit.from_y }, columns });
            const to_i      = xy2i({ xy: { x: exit.to_x, y: exit.to_y }, columns });
            const dir       = exit.dir;
            if (exit.removing) {
                // remove
                exits.grid[from_i][dir]?.delete(to_i);
                // clean up empty sets
                if (! exits.grid[from_i][dir]?.size) {
                    delete exits.grid[from_i][dir];
                }
            }
            else {
                exits.grid[from_i][dir] ??= new Set();
                exits.grid[from_i][dir].add(to_i);
            }
        }
        else {
            const { from, to, dir } = exit;
            if (exit.removing) {
                // remove
                exits.node[from][dir]?.delete(to);
                // clean up empty sets
                if (! exits.node[from][dir]?.size) {
                    delete exits.node[from][dir];
                }
            }
            else {
                exits.node[from][dir] ??= new Set();
                exits.node[from][dir].add(to);
            }
        }
    }
}

const EDIT_EXITS_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    from: {
        type: 'string',
    },
    to: {
        type: 'string',
    },
    from_x: {
        type: 'number',
    },
    from_y: {
        type: 'number',
    },
    to_x: {
        type: 'number',
    },
    to_y: {
        type: 'number',
    },
    dir: {
        required: true,
        type: 'string',
        aliases: 'direction',
    },
}
// wrapper for edit_exits
Macro.add(['connect_map', 'connectmap', 'disconnect_map', 'disconnectmap'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, EDIT_EXITS_TEMPLATE, this.args);
        argObj.removing = name.includes('disconnect');
        argObj.add_metadata('name', name);
        edit_exits(argObj);
    },
});
// edit exits
function edit_exits(argObj) {
    const name = argObj.name ?? 'Sleepymap.edit_exits';

    // VALIDATE: required args & type
    ArgObj.validate(name, EDIT_EXITS_TEMPLATE, argObj);

    const { mapname, from, to, from_x, from_y, to_x, to_y, dir } = argObj;
    const removing = argObj.removing ?? false   // default value
    const this_map = maps[mapname];
    const { mapnodes, maparray, columns } = this_map;

    // BASIC ERRORS
    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }
    // ERROR: invalid dir
    else if (! Object.keys(is_diagonal).includes(dir)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — invalid dir "${dir}", must be one of "N", "E", "S", "W", "NE", "SE", "SW", "NW"!`);
    }

    // FROM/TO INPUT ERRORS
    const has_node_inputs = from !== undefined || to !== undefined;
    const has_grid_inputs = from_x !== undefined || from_y !== undefined || to_x !== undefined || to_y !== undefined;
    // ERROR: missing args
    if ((! has_node_inputs) && (! has_grid_inputs)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — must specify both from/to or, all of from_x/from_y/to_x/to_y!`);
    }
    // ERROR: attempted mixed mode
    if (has_node_inputs && has_grid_inputs) {
        throw new Error(`${name} — Sleepymap "${mapname}" — can't specify both from/to and from_x/from_y/to_x/to_y, must pick mode or the other!`);
    }
    // ERROR: incomplete data
    else if (
        (
            has_node_inputs &&
            (from === undefined || to === undefined)
        ) ||
        (
            has_grid_inputs &&
            (from_x === undefined || from_y === undefined || to_x === undefined || to_y === undefined)
        )
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — incomplete data, must specify both from/to or, all of from_x/from_y/to_x/to_y!`);
    }
    // ERROR: non-extant mapnode
    else if (
        has_node_inputs &&
        (! (Object.hasOwn(mapnodes, from) && Object.hasOwn(mapnodes, to)))
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — couldn't find mapnode with name "${from}" or "${to}"!`);
    }
    // VALIDATE: bounds
    else if (has_grid_inputs) {
        validate_bounds({ name, mapname, columns, maparray, x: from_x, y: from_y });
        validate_bounds({ name, mapname, columns, maparray, x: to_x, y: to_y });
    }

    // Define the nodes being connected
    const from_mapnode  = has_node_inputs 
                            ? from 
                            : maparray[xy2i({ xy: { x: from_x, y: from_y }, columns })];
        
    const to_mapnode    = has_node_inputs 
                            ? to 
                            : maparray[xy2i({ xy: { x: to_x, y: to_y }, columns })];

    // WARNING: connecting from a wall
    if (mapnodes[from_mapnode]?.type === 'wall') {
        console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${from_mapnode}" is a wall, this connection will be non-functional!`);
    }
    // WARNING: connecting to a wall
    if (mapnodes[to_mapnode]?.type === 'wall') {
        console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${to_mapnode}" is a wall, this connection will be non-functional!`);
    }
    // WARNING: node input, connecting to self
    if (has_node_inputs && (from === to)) {
        console.warn(`${name} — Sleepymap "${mapname}" — connecting mapnode "${from_mapnode}" to itself is usually redundant!`);
    }
    // WARNING grid input, connecting to self
    if (has_grid_inputs && (from_x === to_x && from_y === to_y)) {
        console.warn(`${name} — Sleepymap "${mapname}" — connecting grid position (${from_x}, ${from_y}) to itself is usually redundant!`);
    }

    const exits = this_map.exits;
    // define manual exit
    const manual_exit   = from === undefined
                            ? { grid_mode: true, removing, dir, from_x, from_y, to_x, to_y }
                            : { grid_mode: false, removing, dir, from, to };
    // store into exits object
    exits.manual.push(manual_exit);
    update_exits({ mapname });
}



// ████   ████   ████ █████
// █   █ █    █ █     █
// ████  █    █  ███  ███
// █   █ █    █     █ █
// █   █  ████  ████  █████
// SECTION: rose for navigation

const CREATE_ROSE_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    autoupdate: {
        type: 'boolean',
    },
    background: {
        type: 'string',
        aliases: 'bg',
    },
}
// macro wrapper, calls the create_rose function (which returns a $rose object)
// then attaches it to the macro output
Macro.add(['place_rose', 'placerose'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, CREATE_ROSE_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        create_rose(argObj).appendTo(this.output);
    }
});

// creates a 3x3 grid of links for navigation in each direction
// returns a $rose jQuery element
function create_rose(argObj) {
    const name = argObj.name ?? 'Sleepymap.create_rose';

    // VALIDATE: required args & type
    ArgObj.validate(name, CREATE_ROSE_TEMPLATE, argObj);

    const { mapname, background } = argObj;
    const autoupdate = argObj.autoupdate ?? options.default.autoupdate_rose;    // default value
    const this_map = maps[mapname];

    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }

    const { grid_movement, columns, maparray, mapnodes, mapvars, exits } = this_map;

    const position = State.variables[mapvars.position.slice(1)];
    // VALIDATE: position
    validate_position({ name, position });

    const frozen    = mapvars.frozen !== undefined      
                        ? State.variables[mapvars.frozen.slice(1)] 
                        : false;
    const disabled  = mapvars.disabled !== undefined    
                        ? State.variables[mapvars.disabled.slice(1)] 
                        : null;
    const hidden    = mapvars.hidden !== undefined    
                        ? State.variables[mapvars.hidden.slice(1)]   
                        : null;

    const mapnode = mapnodes[position.mapnode];

    // create rose
    const $rose = $(document.createElement('div'));
    $rose
        .addClass('macro-Sleepymap-rose')
        .attr('data-mapname', mapname)
        .attr('data-mapnode', position.mapnode)
        .attr('data-x', position.x)
        .attr('data-y', position.y)
        .attr('data-autoupdate', autoupdate)
        .data('argObj', argObj);

    // insert background
    if (background) {
        $(document.createElement('div'))
            .addClass('macro-Sleepymap-rosebg')
            .wiki(background)
            .appendTo($rose);
    }

    // create center
    $(document.createElement('div'))
        .addClass('macro-Sleepymap-dir')
        .attr('data-dir', 'C')
        .attr('data-mapnode-name', mapnode.name)
        .attr('data-mapnode', mapnode.id)
        .attr('data-x', position.x)
        .attr('data-y', position.y)
        .html(mapnode.name)
        .appendTo($rose);
    
    // create each dir
    // SYNC REMINDER: this is manually set, instead of relying on a global constant
    // ordered this way so that grid auto-fills in the correct sequence
    for (const dir of ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE']) {
        // create dir container
        const $dir  = $(document.createElement('div'));
        $dir
            .addClass('macro-Sleepymap-dir')
            .attr('data-dir', dir)
            .appendTo($rose);

        // add links to rose
        // diagonals will be empty if not enabled
        // grid travel
        if (grid_movement) {
            const mapindex = xy2i({ xy: position, columns });
            // skip if no exit in this direction
            if (exits.grid[mapindex][dir] === undefined) {
                continue;
            }
            for (const i of exits.grid[mapindex][dir]) {
                const exit_mapnode = mapnodes[maparray[i]];

                // WARNING: skip corrupted nodes
                if (exit_mapnode === undefined) {
                    console.warn(`${name} — Sleepymap "${mapname}" — encountered invalid mapindex "${i}" for direction "${dir}"`);
                    continue;
                }

                const xy = i2xy({ i, columns });
                // use label if same room or if other room's name is non-extant
                const label = (position.mapnode === exit_mapnode.id) || (exit_mapnode.name === undefined)
                                ? `<span class='macro-Sleepymap-label'>${options.labels[dir]}</span>`
                                : `<span class='macro-Sleepymap-label'>${exit_mapnode.name}</span>`;
                $(document.createElement('a'))
                    .addClass('macro-Sleepymap-link')
                    .attr('data-dir', dir)
                    .attr('data-mapnode-name', exit_mapnode.name)
                    .attr('data-mapnode', exit_mapnode.id)
                    .attr('data-x', xy.x)
                    .attr('data-y', xy.y)
                    .attr('disabled', disabled?.[exit_mapnode.id] || frozen)
                    .css({
                        visibility: hidden?.[exit_mapnode.id] ? 'hidden' : '',
                    })
                    .html(label)
                    .appendTo($dir);
            }
        }
        // node travel
        else {
            // if no exits in this direction for this mapnode, skip
            if (exits.node[position.mapnode][dir] === undefined) continue;

            // iterate through exits
            for (const id of exits.node[position.mapnode][dir]) {
                const exit_mapnode = mapnodes[id];

                // WARNING: skip corrupted nodes
                if (exit_mapnode === undefined) {
                    console.warn(`${name} — Sleepymap "${mapname}" — encountered invalid mapnode "${id}" for direction "${dir}"`);
                    continue;
                }

                $(document.createElement('a'))
                    .addClass('macro-Sleepymap-link')
                    .attr('data-dir', dir)
                    .attr('data-mapnode-name', exit_mapnode.name)
                    .attr('data-mapnode', exit_mapnode.id)
                    .attr('data-x', 'undefined')
                    .attr('data-y', 'undefined')
                    .attr('disabled', disabled?.[exit_mapnode.id] || frozen)
                    .css({
                        visibility: hidden?.[exit_mapnode.id] ? 'hidden' : '',
                    })
                    .html(exit_mapnode.name)
                    .appendTo($dir);
            }
        }
    }

    // click listener that triggers mapmove & rose refresh
    $rose.on('click', '.macro-Sleepymap-link', function(ev) {
        // uses "this" because that is the element that matches the selector ^
        // whereas ev.target is the thing clicked, which maybe inside the matched element
        // link disabled, do nothing
        if ($(this).attr('disabled')) {
            return;
        }
        // attempt move to target
        const target_mapnode = $(this).attr('data-mapnode');
        const target_x = Number($(this).attr('data-x'));
        const target_y = Number($(this).attr('data-y'));
        begin_mapmove({
            mapname,
            target_mapnode,
            target_x: Number.isFinite(target_x) ? target_x : undefined,
            target_y: Number.isFinite(target_y) ? target_y : undefined,
            suppress_warnings: true,
        });
    });

    return $rose;
}

// manual update $rose function
const UPDATE_ROSE_TEMPLATE = {
    selector: {
        type: 'string',
    },
    $rose: {
        type: 'object',
    },
}
// macro wrapper
Macro.add(['update_rose', 'updaterose'], {
    handler: function() {
        const name = this.name;
        const argObj = new ArgObj(name, UPDATE_ROSE_TEMPLATE, this.args);
        argObj.$rose = $(argObj.selector);
        argObj.add_metadata('name', name);
        update_rose(argObj);
    }
});
function update_rose(argObj) {
    const name = 'Sleepymap.update_rose';

    // VALIDATE: required args & type
    ArgObj.validate(name, UPDATE_ROSE_TEMPLATE, argObj);
    // if $rose undefined, check for selector
    const $rose = argObj.$rose ?? (argObj.selector ? $(argObj.selector) : undefined);

    // ERROR: no input
    if ($rose === undefined) {
        throw new Error(`${name} — Sleepymap — no input provided!`);
    }
    // ERROR: $rose isn't a jQuery obj
    else if (! ($rose instanceof jQuery)) {
        throw new Error(`${name} — Sleepymap — $rose must be a jQuery instance!`);
    }
    // WARNING: empty jQuery instance
    if ($rose.length === 0) {
        console.warn(`${name} — Sleepymap — $rose is empty!`);
        return;
    }
    
    // update rose using argObj stored on rose
    $rose.each( function() {
        if (! $(this).hasClass('macro-Sleepymap-rose')) {
            console.warn(`${name} — Sleepymap — provided jQuery object is not a map rose!`);
            console.warn($(this));
            return
        }
        $(this).replaceWith(create_rose($(this).data('argObj')));
    });
}




// █    █  ███  ████  █   █ ███ █████ █     █
// ██  ██ █   █ █   █ █   █  █  █     █     █
// █ ██ █ █████ ████  █   █  █  ███   █  █  █
// █    █ █   █ █      █ █   █  █     █ █ █ █
// █    █ █   █ █       █   ███ █████  █   █
// SECTION: mapview, the visual map to be displayed

const CREATE_MAPVIEW_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    autoupdate: {
        type: 'boolean',
    },
    clickable: {
        type: 'boolean',
    },
    background: {
        type: 'string',
        aliases: 'bg',
    },
    show_labels: {
        type: 'boolean',
    },
}
// macro wrapper, creates & places mapview
Macro.add(['place_mapview', 'placemapview'], {
    handler: function() {
        const name = this.name;
        const argObj = new ArgObj(name, CREATE_MAPVIEW_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        create_mapview(argObj).appendTo(this.output);
    }
});
// returns map object
function create_mapview(argObj) {
    const name = argObj.name ?? 'Sleepymap.create_mapview';

    // VALIDATE: required args & type
    ArgObj.validate(name, CREATE_MAPVIEW_TEMPLATE, argObj);

    const { mapname, background } = argObj;
    const show_labels   = argObj.show_labels ?? options.default.show_labels_on_mapview; // default value
    const autoupdate    = argObj.autoupdate ?? options.default.autoupdate_mapview;      // default value
    const clickable     = argObj.clickable  ?? options.default.clickable_mapview;       // default value
    const this_map = maps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }

    const mapvars = this_map.mapvars;
    const position = State.variables[mapvars.position.slice(1)];
    // VALIDATE: position
    validate_position({ name, position });

    const frozen    = mapvars.frozen !== undefined      
                        ? State.variables[mapvars.frozen.slice(1)] 
                        : false;
    const disabled  = mapvars.disabled !== undefined    
                        ? State.variables[mapvars.disabled.slice(1)] 
                        : null;
    const hidden    = mapvars.hidden   !== undefined    
                        ? State.variables[mapvars.hidden.slice(1)]   
                        : null;

    const { grid_movement, columns, maparray, mapnodes, exits, entities } = this_map;
    
    // create map object
    // use maparray & columns if no mapview object
    const mapview = this_map.mapview ?? {columns, array: maparray};
    const $mapview = $(document.createElement('div'));
    $mapview
        .addClass('macro-Sleepymap-mapview')
        .attr('data-maptype', grid_movement ? 'grid' : 'node')
        .attr('data-mapname', mapname)
        .attr('data-mapnode', position.mapnode)
        .attr('data-x', position.x)
        .attr('data-y', position.y)
        .attr('data-autoupdate', autoupdate)
        .data('argObj', argObj)
        .css({
            '--columns': mapview.columns,
        });
    
    // append bg
    if (background) {
        $(document.createElement('div'))
            .addClass('macro-Sleepymap-mapviewbg')
            .wiki(background)
            .appendTo($mapview);
    }

    // map out dirs to i's
    const mapindex = xy2i({ xy: position, columns });
    const offsets = get_offsets({ columns });
    const dir_map = {};
    for (const dir in offsets) {
        dir_map[mapindex + offsets[dir]] = dir;
    }
    // map out entities to i's
    const entity_map = {}
    for (const entityname in entities) {
        const entity = entities[entityname];
        const i = xy2i({ xy: { x: entity.x, y: entity.y }, columns });
        entity_map[i] ??= [];
        entity_map[i].push(entity.entityname);
    }

    // create & append tiles
    for (let i = 0; i < mapview.array.length; i++) {
        const id = mapview.array[i];
        const mapnode = mapnodes[id];

        // define traversability
        function is_traversable() {
            if (mapnode.type === 'wall') return false;
            if (grid_movement) {
                if (mapindex === i) return null;
                return Object.keys(exits.grid[mapindex]).some( dir => exits.grid[mapindex][dir].has(i) );
            }
            else {
                if (position.mapnode === id) return null;
                return Object.values(exits.node[position.mapnode]).some( dir => dir.has(id) );
            }
        }
        // if clickable & valid travel destination --> clickable
        const link  = ! clickable
                        ? false
                        : !! is_traversable();

        const xy = i2xy({ i, columns: mapview.columns });
        // labels only work in grid mode
        const dir = dir_map[i];
        const label     = ! (show_labels && grid_movement && is_traversable())
                            ? ''
                        // use labels if same room or if room name is non-extant
                        : (dir !== undefined) && ((position.mapnode === mapnode.id) || (mapnode.name === undefined))
                            ? `<span class='macro-Sleepymap-label'>${options.labels[dir]}</span>`
                        : `<span class='macro-Sleepymap-label'>${mapnode.name}</span>`;
        const $tile = $(document.createElement(link ? 'a' : 'div'));
        $tile
            .addClass('macro-Sleepymap-tile')
            .addClass(link ? 'macro-Sleepymap-link' : '')
            // change traversable to 'current' for CSS targeting
            .attr('data-traversable', is_traversable() === null ? 'current' : is_traversable())
            .attr('data-type', mapnode.type)
            .attr('data-mapnode-name', mapnode.name)
            .attr('data-mapnode', id)
            .attr('data-x', xy.x)
            .attr('data-y', xy.y)
            .attr('disabled', disabled?.[id] || frozen)
            .css({
                visibility: hidden?.[id] ? 'hidden' : '',
            })
            // defined tile content +? mapnode name wrapped in a span
            .wiki(mapnode.tile ?? '')
            // print label
            .wiki(label)

        // print entities
        if (entity_map[i] !== undefined) {
            for (const entityname of entity_map[i]) {
                const entity = entities[entityname];
                $tile.wiki(`<span class='macro-Sleepymap-entity'>${entity?.tile ?? ''}</span>`);
            }
        }
        
        $mapview.append($tile);
    }

    // if clickable add link functionality
    if (clickable) {
        $mapview.on('click', '.macro-Sleepymap-link', function(ev) {
            // uses "this" because that is the element that matches the selector ^
            // whereas ev.target is the thing clicked, which maybe inside the matched element
            // if disabled, do nothing
            if ($(this).attr('disabled')) {
                return;
            }
            // attempt mapmove
            const target_mapnode = $(this).attr('data-mapnode');
            const target_x = Number($(this).attr('data-x'));
            const target_y = Number($(this).attr('data-y'));
            begin_mapmove({
                mapname,
                target_mapnode,
                target_x: Number.isFinite(target_x) ? target_x : undefined,
                target_y: Number.isFinite(target_y) ? target_y : undefined,
                suppress_warnings: true,
            });
        });
    }

    return $mapview;
}

// manual update mapview function
const UPDATE_MAPVIEW_TEMPLATE = {
    selector: {
        type: 'string',
    },
    $mapview: {
        type: 'object',
    },
}
// macro wrapper
Macro.add(['update_mapview', 'updatemapview'], {
    handler: function() {
        const name = this.name;
        const argObj = new ArgObj(name, UPDATE_MAPVIEW_TEMPLATE, this.args);
        argObj.$mapview = $(argObj.selector);
        argObj.add_metadata('name', name);
        update_mapview(argObj);
    }
});
function update_mapview(argObj) {
    const name = 'Sleepymap.update_mapview';

    // VALIDATE: required args & type
    ArgObj.validate(name, UPDATE_MAPVIEW_TEMPLATE, argObj);
    const $mapview = argObj.$mapview ?? (argObj.selector ? $(argObj.selector) : undefined);

    // ERROR: no mapview provided
    if ($mapview === undefined) {
        throw new Error(`${name} — Sleepymap — no mapview provided!`);
    }
    // ERROR: $mapview isn't a jQuery obj
    else if (! ($mapview instanceof jQuery)) {
        throw new Error(`${name} — Sleepymap — $mapview must be a jQuery instance!`);
    }
    // WARNING: empty jQuery instance
    if ($mapview.length === 0) {
        console.warn(`${name} — Sleepymap — $mapview is empty!`);
        return;
    }

    // update mapview using argObj stored on mapview
    $mapview.each( function() {
        if (! $(this).hasClass('macro-Sleepymap-mapview')) {
            console.warn(`${name} — Sleepymap — provided jQuery object is not a map mapview!`);
            console.warn($(this));
            return
        }
        $(this).replaceWith(create_mapview($(this).data('argObj')));
    });
}




//  ███  █   █ █████  ████  █   █ ████  ████   ███  █████ █████
// █   █ █   █   █   █    █ █   █ █   █ █   █ █   █   █   █
// █████ █   █   █   █    █ █   █ ████  █   █ █████   █   ███
// █   █ █   █   █   █    █ █   █ █     █   █ █   █   █   █
// █   █  ███    █    ████   ███  █     ████  █   █   █   █████
// SECTION: rose & mapview autoupdate handler
$(document).on('Sleepymap:mapmove_resolved Sleepymap:map_edited', function(ev, data) {
    const $roses = $('.macro-Sleepymap-rose[data-autoupdate="true"]');
    $roses.each( function() {
        const $rose = $(this);
        const argObj = $rose.data('argObj');
        if (argObj.mapname === data?.mapname) {
            $rose.replaceWith(create_rose(argObj));
        }
    });
    const $mapviews = $('.macro-Sleepymap-mapview[data-autoupdate="true"]');
    $mapviews.each( function() {
        const $mapview = $(this);
        const argObj = $mapview.data('argObj');
        if (argObj.mapname === data?.mapname) {
            $mapview.replaceWith(create_mapview(argObj));
        }
    });
});




// █████ █    █ █████ ███ █████ ███ █████  ████
// █     ██   █   █    █    █    █  █     █
// ███   █ █  █   █    █    █    █  ███    ███
// █     █  █ █   █    █    █    █  █         █
// █████ █   ██   █   ███   █   ███ █████ ████
// SECTION: entities

const SET_ENTITY_TEMPLATE = {
    mapname: {
        type: 'string',
        required: true,
    },
    entityname: {
        type: 'string',
        required: true,
    },
    x: {
        type: 'number',
        required: true,
    },
    y: {
        type: 'number',
        required: true,
    },
    tile: {
        type: 'string',
    },
};
const DELETE_ENTITY_TEMPLATE = {
    mapname: {
        type: 'string',
        required: true,
    },
    entityname: {
        type: 'string',
        required: true,
    },
    // JS properties
    removing: {
        type: 'boolean',
    },
};
Macro.add(['new_entity', 'newentity', 'set_entity', 'setentity', 'delete_entity', 'deleteentity'], {
    handler() {
        const name = this.name;
        const template = this.name.includes('delete') ? DELETE_ENTITY_TEMPLATE : SET_ENTITY_TEMPLATE;
        const argObj = new ArgObj(name, template, this.args);
        argObj.removing = this.name.includes('delete');
        argObj.add_metadata('name', name);
        set_entity(argObj);
    }
});
function set_entity(argObj) {
    const name = argObj.name ?? 'Sleepymap.set_entity';

    const removing = argObj.removing ?? false;  // default value

    // VALIDATE: required args & type
    const template = removing ? DELETE_ENTITY_TEMPLATE : SET_ENTITY_TEMPLATE;
    ArgObj.validate(name, template, argObj);

    const { mapname, entityname, x, y, tile } = argObj;
    const this_map = maps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }
    // WARNING: removing, unused x, y, or tile
    if (removing && (x !== undefined || y !== undefined || tile !== undefined)) {
        console.warn(`${name} — Sleepymap "${mapname}" — removing entity, args "x", "y", and "tile" will be ignored!`)
    }

    const entities = this_map.entities;
    if (removing) {
        delete entities[entityname];
    }
    else {
        entities[entityname] = {
            entityname,
            x,
            y,
            tile,
        }
    }
}



// █    █  ███  ████       ████  ████ ████  ███ ████  █████  ████
// ██  ██ █   █ █   █     █     █     █   █  █  █   █   █   █
// █ ██ █ █████ ████       ███  █     ████   █  ████    █    ███
// █    █ █   █ █             █ █     █   █  █  █       █       █
// █    █ █   █ █         ████   ████ █   █ ███ █       █   ████
// SECTION: map scripts
// macro sets scripts to run at various parts of the process:
//      when attempting, immediately, before success or failure is determined
//      when starting, before position updates
//      when ending, after position updates
//      when aborting

const SET_SCRIPTS_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    // JS property
    scripts: {
        type: 'object',
    },
};
// SYNC REMINDER: changing here requires also changing the for loop in set_scripts
const ONMAP_TRIGGERS_TEMPLATE = {
    to: {
        type: ['string', 'object'],
    },
    from: {
        type: ['string', 'object'],
    },
    to_x: {
        type: ['number', 'object'],
    },
    to_y: {
        type: ['number', 'object'],
    },
    from_x: {
        type: ['number', 'object'],
    },
    from_y: {
        type: ['number', 'object'],
    },
};
// macro wrapper for set_scripts
Macro.add(['set_scripts','setscripts'], {

    tags: ['onmapattempt', 'onmapstart', 'onmapend', 'onmapabort'],

    handler() {

        const name = this.name;

        // ERROR: macro being called outside StoryInit
        if (turns() !== 0) {
            throw new Error(`${name} — Sleepymap — macro must be called during StoryInit!`);
        }

        const argObj = new ArgObj(name, SET_SCRIPTS_TEMPLATE, this.args);

        // parse each payload, push to array, attach to argObj
        argObj.scripts = [];
        for(let i = 1; i < this.payload.length; i++) {
            const p = this.payload[i];
            const child_argObj = new ArgObj(p.name, ONMAP_TRIGGERS_TEMPLATE, p.args);
            argObj.scripts.push({
                type: p.name,
                triggers: child_argObj,
                contents: p.contents,
            });
        }

        argObj.add_metadata('name', name);
        set_scripts(argObj);
    }
});

// assigns scripts to map object on new_map macro object
function set_scripts(argObj) {
    const name = argObj.name ?? 'Sleepymap.set_scripts';

    // VALIDATE: required args & types
    ArgObj.validate(name, SET_SCRIPTS_TEMPLATE, argObj);
    
    const { mapname, scripts } = argObj;
    const this_map = maps[mapname];
    
    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }
    // ERROR: invalid script object
    else if (! Array.isArray(scripts)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — invalid "scripts" input, must be an array!`);
    }

    // error checking & object shaping
    for (const script of scripts) {
        // VALIDATE: types
        ArgObj.validate(name, ONMAP_TRIGGERS_TEMPLATE, script.triggers);
        
        // SYNC REMINDER: changing here also requires changing <<set_scripts>> args
        for (const arg of Object.keys(ONMAP_TRIGGERS_TEMPLATE)) {
            // arg not defined, continue
            if (! Object.hasOwn(script.triggers, arg)) {
                continue;
            }
            // any trigger, make empty, continue
            else if (script.triggers[arg] === 'any') {
                delete script.triggers[arg];
                continue;
            }

            // wrap in array
            script.triggers[arg] = [script.triggers[arg]].flat();
            
            // check each array element
            script.triggers[arg].forEach( trigger => {
                // ERROR: make sure each from/to element is a string
                if (['to', 'from'].includes(arg) && typeof trigger !== 'string') {
                    throw new Error(`${name} — ${script.type} — Sleepymap "${mapname}", "${arg}" must be a string, array of strings, or keyword "any"`);
                }
                // ERROR: make sure each from_x/from_y/to_x/to_y element is a number
                else if (typeof trigger !== 'number') {
                    throw new Error(`${name} — ${script.type} — Sleepymap "${mapname}", "${arg}" must be a number, array of numbers, or keyword "any"`);
                }
            });
        }
    }
    this_map.scripts = scripts;
}




// █    █  ███  ████  █    █  ████  █   █ █████
// ██  ██ █   █ █   █ ██  ██ █    █ █   █ █
// █ ██ █ █████ ████  █ ██ █ █    █ █   █ ███
// █    █ █   █ █     █    █ █    █  █ █  █
// █    █ █   █ █     █    █  ████    █   █████
// SECTION: mapmove
// begin_mapmove starts map movement,
//      then fires event off #passages, 
//      listener on document catches and calls resolve_mapmove
// resolve_mapmove checks if movement should continue
//      then updates to new position
//      fires ending event off #passages
// done this way to allow authors to intercept and manipulate if they like

const BEGIN_MAPMOVE_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    target_mapnode: {
        type: 'string',
        aliases: ['id', 'node', 'mapnode'],
    },
    target_x: {
        type: 'number',
        aliases: 'x',
    },
    target_y: {
        type: 'number',
        aliases: 'y',
    },
    force_abort: {
        type: 'boolean',
    },
    skip_scripts: {
        type: 'boolean',
    },
    suppress_warnings: {
        type: 'boolean',
    },
};
// macro wrapper for begin_mapmove
Macro.add(['mapmove', 'map_move'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, BEGIN_MAPMOVE_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        begin_mapmove(argObj);      
    }
});

// begins map movement procedure
function begin_mapmove(argObj) {
    const name = argObj.name ?? 'Sleepymap.begin_mapmove';

    // VALIDATE: required args & type
    ArgObj.validate(name, BEGIN_MAPMOVE_TEMPLATE, argObj);

    const { mapname } = argObj;
    const force_abort = argObj.force_abort ?? false;                // default value
    const skip_scripts = argObj.skip_scripts ?? false;              // default value
    const suppress_warnings = argObj.suppress_warnings ?? false;    // default value

    const this_map = maps[mapname];

    // ERROR: map not found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }
    // ERROR: not enough target information
    else if (
        argObj.target_mapnode === undefined && 
        (argObj.target_x === undefined || argObj.target_y === undefined)
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — missing required args "target_mapnode" or, "target_x" and "target_y"!`);
    }

    const { grid_movement, columns, maparray, mapvars, entities } = this_map;

    // WARNING: assumed arg because no xy
    if (
        (! suppress_warnings) && 
        grid_movement && 
        (argObj.target_x === undefined || argObj.target_y === undefined) && 
        (argObj.target_mapnode !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses grid movement, will use first "target_x" and "target_y" found!`);
    }
    // WARNING: assumed arg because no mapnode
    if (
        (! suppress_warnings) && 
        (! grid_movement) && 
        (argObj.target_mapnode === undefined) && 
        (argObj.target_x !== undefined && argObj.target_y !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses node movement, will use "target_mapnode" at xy coordinate!`);
    }
    // WARNING: extra mapnode args
    if (
        (! suppress_warnings) &&
        grid_movement && 
        (argObj.target_x !== undefined && argObj.target_y !== undefined) && 
        (argObj.target_mapnode !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses grid movement, "target_mapnode" will be ignored!`);
    }
    // WARNING: extra xy args
    if (
        (! suppress_warnings) &&
        (! grid_movement) && 
        (argObj.target_mapnode !== undefined) &&
        (argObj.target_x !== undefined && argObj.target_y !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses node movement, "target_x" and "target_y" will be ignored!`);
    }

    // aux function to fetch all valid xys
    function get_xys(mapnode) {
        const xys = [];
        for (let i = 0; i < maparray.length; i++) {
            if (maparray[i] === mapnode) {
                const xy = i2xy({ i, columns });
                xys.push(xy);
            }
        }
        return xys;
    }

    // if grid movement && xy defined, use that to calculate mapnode — else use argObj mapnode
    // reverse for node movement
    const target_mapnode  = (
                                grid_movement && 
                                (argObj.target_x !== undefined) && (argObj.target_y !== undefined)
                            ) ||
                            (
                                (! grid_movement) &&
                                (argObj.target_mapnode === undefined)
                            )
                                ? maparray[xy2i({ xy: { x:argObj.target_x, y:argObj.target_y }, columns })] 
                                : argObj.target_mapnode;

    const target_xys = get_xys(target_mapnode);

    // WARNING: unplaced mapnode
    if (target_xys.length === 0) {
        console.warn(`${name} — Sleepymap "${mapname}" — no tiles exist for mapnode "${target_mapnode}", mapmove non-functional!`);
    }

    // if node movement or, grid movement && x undefined, fetch first — else use argObj x
    const target_x        = (! grid_movement) ||
                            (grid_movement && (argObj.target_x === undefined))
                                ? target_xys?.[0].x
                                : argObj.target_x;
    // if node movement or, grid movement && y undefined, fetch first — else use argObj y
    const target_y        = (! grid_movement) ||
                            (grid_movement && (argObj.target_y === undefined))
                                ? target_xys?.[0].y
                                : argObj.target_y;

    // if node movement, use all possible xys
    const targets = {
        mapnode     : target_mapnode,
        xys         : grid_movement 
                        ? [{ x: target_x, y: target_y }]
                        : target_xys,
        entities    : []
    };

    const position          = State.variables[mapvars.position.slice(1)];
    const origin_mapnode    = position.mapnode;
    const origins = {
        mapnode     : origin_mapnode,
        xys         : grid_movement
                        ? [{ x: position.x, y: position.y }]
                        : get_xys(origin_mapnode),
        entities    : [],
    };

    // attach entities
    for (const entityname in entities) {
        const entity = entities[entityname];
        for (const xy of origins.xys) {
            if (xy.x === entity.x && xy.y === entity.y) {
                origins.entities.push(entity);
            }
        }
        for (const xy of targets.xys) {
            if (xy.x === entity.x && xy.y === entity.y) {
                targets.entities.push(entity);
            }
        }
    }

    // fire began event
    $('#passages').trigger('Sleepymap:mapmove_began', { 
        mapname, 
        origins,
        targets,
        force_abort,
        skip_scripts,
    });

    // fire entities at this location

    // if skipping scripts, done
    if (skip_scripts) return;

    // check for any scripts to fire when beginning an attempt
    const scripts_attempt = this_map.scripts.filter(script => script.type === 'onmapattempt');
    for (const script of scripts_attempt) {
        // check if script applies to this location, if yes run
        if (
            (script.triggers.from === undefined || script.triggers.from.includes(origins.mapnode)) &&
            (script.triggers.to === undefined || script.triggers.to.includes(targets.mapnode)) &&
            origins.xys.some( xy =>
                (script.triggers.from_x === undefined || script.triggers.from_x.includes(xy.x)) &&
                (script.triggers.from_y === undefined || script.triggers.from_y.includes(xy.y))
            ) &&
            targets.xys.some( xy =>
                (script.triggers.to_x === undefined || script.triggers.to_x.includes(xy.x)) &&
                (script.triggers.to_y === undefined || script.triggers.to_y.includes(xy.y))
            )
        ) {
            $.wiki(script.contents);
        }
    }
}

// document listener to catch events an resolve
$(document).on('Sleepymap:mapmove_began', (ev, argObj) => {
    resolve_mapmove(argObj);
});

// resolves map movement procedure
function resolve_mapmove(argObj) {
    const { mapname, origins, targets, force_abort, skip_scripts } = argObj;
    const name = argObj.name ?? 'Sleepymap.resolve_mapmove';
    const this_map = maps[mapname];
    const { grid_movement, mapnodes, mapvars } = this_map;
    const succeeded = force_abort 
                        ? false
                    : mapnodes[targets.mapnode] === undefined
                        ? false
                    : mapnodes[targets.mapnode].type === 'wall'
                        ? false
                    : mapvars?.blocked !== undefined
                        ? ! State.variables[mapvars.blocked.slice(1)][targets.mapnode]
                    : true;
                            
    // mapmove succeeded
    if (succeeded) {
        if (! skip_scripts) {
            // check for any onmapstart scripts
            const scripts_start = this_map.scripts.filter(script => script.type === 'onmapstart');
            for (const script of scripts_start) {
                // check if script applies to this location, if yes run
                if (
                    (script.triggers.from === undefined || script.triggers.from.includes(origins.mapnode)) &&
                    (script.triggers.to === undefined   || script.triggers.to.includes(targets.mapnode)) &&
                    origins.xys.some( xy =>
                        (script.triggers.from_x === undefined || script.triggers.from_x.includes(xy.x)) &&
                        (script.triggers.from_y === undefined || script.triggers.from_y.includes(xy.y))
                    ) &&
                    targets.xys.some( xy =>
                        (script.triggers.to_x === undefined || script.triggers.to_x.includes(xy.x)) &&
                        (script.triggers.to_y === undefined || script.triggers.to_y.includes(xy.y))
                    )
                ) {
                    $.wiki(script.contents);
                }
            }
        }

        const mapnode = targets.mapnode;
        if (grid_movement) {
            const x = targets.xys[0].x;
            const y = targets.xys[0].y;
            State.variables[mapvars.position.slice(1)] = { mapname, mapnode, x, y };
        }
        else {
            State.variables[mapvars.position.slice(1)] = { mapname, mapnode };
        }

        if (! skip_scripts) {
            // check for any onmapend scripts
            const scripts_end = this_map.scripts.filter(script => script.type === 'onmapend');
            for (const script of scripts_end) {
                // check if script applies to this location, if yes run
                if (
                    (script.triggers.from === undefined || script.triggers.from.includes(origins.mapnode)) &&
                    (script.triggers.to === undefined   || script.triggers.to.includes(targets.mapnode)) &&
                    origins.xys.some( xy =>
                        (script.triggers.from_x === undefined || script.triggers.from_x.includes(xy.x)) &&
                        (script.triggers.from_y === undefined || script.triggers.from_y.includes(xy.y))
                    ) &&
                    targets.xys.some( xy =>
                        (script.triggers.to_x === undefined || script.triggers.to_x.includes(xy.x)) &&
                        (script.triggers.to_y === undefined || script.triggers.to_y.includes(xy.y))
                    )
                ) {
                    $.wiki(script.contents);
                }
            }
        }
    }
    // aborting
    else if (! skip_scripts) {
        // check for any onmapabort scripts
        const scripts_abort = this_map.scripts.filter(script => script.type === 'onmapabort');
        for (const script of scripts_abort) {
            // check if script applies to this location, if yes run
            if (
                (script.triggers.from === undefined || script.triggers.from.includes(origins.mapnode)) &&
                (script.triggers.to === undefined   || script.triggers.to.includes(targets.mapnode)) &&
                origins.xys.some( xy =>
                    (script.triggers.from_x === undefined || script.triggers.from_x.includes(xy.x)) &&
                    (script.triggers.from_y === undefined || script.triggers.from_y.includes(xy.y))
                ) &&
                targets.xys.some( xy =>
                    (script.triggers.to_x === undefined || script.triggers.to_x.includes(xy.x)) &&
                    (script.triggers.to_y === undefined || script.triggers.to_y.includes(xy.y))
                )
            ) {
                $.wiki(script.contents);
            }
        }
    }
    
    // fire resolved event
    $('#passages').trigger('Sleepymap:mapmove_resolved', { 
        mapname, 
        origins, 
        targets,
        succeeded,
    });
}




//  ███  █   █ █   █
// █   █ █   █  █ █
// █████ █   █   █
// █   █ █   █  █ █
// █   █  ███  █   █
// SECTION: auxiliary functions for JS things

// convert xy object to i index
function xy2i(argObj) {
    const { xy, columns } = argObj;
    return xy.y * columns + xy.x;
}
// convert i index to xy object
function i2xy(argObj) {
    const { i, columns } = argObj;
    return { x: i % columns, y: Math.floor(i / columns) };
}
// generate object with offsets
function get_offsets(argObj) {
    const { columns } = argObj;
    return {
        N   : -columns,
        E   : 1,
        S   : columns,
        W   : -1,
        NE  : -columns + 1,
        SE  : columns + 1,
        SW  : columns - 1,
        NW  : -columns - 1,
    };
}
// validate position object
function validate_position(argObj) {
    const name = argObj.name ??= 'Sleepymap.validate_position';
    const position = argObj.position;

    // ERROR: position undefined
    if (position === undefined) {
        throw new Error(`${name} — Sleepymap — corrupted position object, position is undefined!`);
    }

    const { mapname, mapnode, x, y } = position;
    
    // ERROR: no mapname
    if (mapname === undefined) {
        throw new Error(`${name} — Sleepymap — corrupted position object, missing "mapname" property!`);
    }
    
    const this_map = maps[mapname];
    
    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — corrupted position object, "${mapname}" map not found!`);
    }
    
    const { columns, maparray, mapnodes, grid_movement } = this_map;
    
    // ERROR: non-extant mapnode
    if (! Object.hasOwn(mapnodes, mapnode)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — corrupted position object, mapnode "${mapnode}" not found on map!`);
    }

    // validate bounds if grid movement is enabled
    if (grid_movement) {
        if (x === undefined || y === undefined) {
            throw new Error(`${name} — Sleepymap "${mapname}" — corrupted position object, missing "x" or "y" for grid movement!`);
        }
        validate_bounds({ name, mapname, columns, maparray, x, y });
    }
}

function validate_bounds(argObj) {
    const name = argObj.name ??= 'Sleepymap.validate_bounds';
    const { mapname, columns, maparray, x, y } = argObj;
    
    const rows = maparray.length / columns;

    // ERROR: x out of bounds
    if (x < 0 || x >= columns) {
        throw new Error(`${name} — Sleepymap "${mapname}" — x coordinate ${x} out of bounds, must be: 0 <= x < ${columns}!`);
    }
    // ERROR: y out of bounds
    else if (y < 0 || y >= rows) {
        throw new Error(`${name} — Sleepymap "${mapname}" — y coordinate ${y} out of bounds, must be: 0 <= y < ${rows}!`);
    }
}

// exposed helpers
// fetch a clone of map object
function get_map(argObj) {
    const mapname = argObj.mapname;
    const name = 'Sleepymap.get_map';
    const this_map = maps[mapname];
    // ERROR: missing arg
    if (mapname === undefined) {
        throw new Error(`${name} — Sleepymap — missing required mapname argument!`);
    }
    // ERROR: non-extant map
    else if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }
    return structuredClone(maps[mapname]);
}
// edit the map object
function edit_map(argObj) {
    const { mapname, diagonals, columns, maparray, mapview, mapnodes } = argObj;
    const name = 'Sleepymap.edit_map';
    const this_map = maps[mapname];
    let exits_need_updating = false;

    // ERROR: missing arg
    if (mapname === undefined) {
        throw new Error(`${name} — Sleepymap — missing required mapname argument!`);
    }
    // ERROR: non-extant map
    else if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }

//   ┌┬┐┬┌─┐┌─┐┌─┐┌┐┌┌─┐┬  ┌─┐
//    │││├─┤│ ┬│ ││││├─┤│  └─┐
//   ─┴┘┴┴ ┴└─┘└─┘┘└┘┴ ┴┴─┘└─┘
//  SECTION:diagonals
    if (diagonals !== undefined) {
        // ERROR: diagonals not boolean
        if (typeof diagonals !== 'boolean') {
            throw new Error(`${name} — Sleepymap "${mapname}" — diagonals must be a boolean!`);
        }
        this_map.diagonals = diagonals;
        exits_need_updating = true;
    }

//   ┌─┐┌─┐┬  ┬ ┬┌┬┐┌┐┌┌─┐   ┬   ┌┬┐┌─┐┌─┐┌─┐┬─┐┬─┐┌─┐┬ ┬
//   │  │ ││  │ │││││││└─┐  ┌┼─  │││├─┤├─┘├─┤├┬┘├┬┘├─┤└┬┘
//   └─┘└─┘┴─┘└─┘┴ ┴┘└┘└─┘  └┘   ┴ ┴┴ ┴┴  ┴ ┴┴└─┴└─┴ ┴ ┴
//  SECTION: columns & maparray
    // ERROR: columns not a number
    if ((columns !== undefined) && (typeof columns !== 'number')) {
        throw new Error(`${name} — Sleepymap "${mapname}" — columns must be a number!`);
    }
    // ERROR: maparray not an array (or undefined)
    else if ((maparray !== undefined) && (! Array.isArray(maparray)) 
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — maparray must be an array!`);
    }
    if ((columns !== undefined) || (maparray !== undefined)) {
        // ERROR: maparray not rectangular
        if ((maparray?.length ?? this_map.maparray.length) % (columns ?? this_map.columns) !== 0) {
            throw new Error(`${name} — Sleepymap "${mapname}" — new columns or maparray would break rectangularity!`);
        }
        this_map.columns = columns ?? this_map.columns;
        this_map.maparray = maparray ?? this_map.maparray;
        exits_need_updating = true;
    }

//   ┌┬┐┌─┐┌─┐┬  ┬┬┌─┐┬ ┬
//   │││├─┤├─┘└┐┌┘│├┤ │││
//   ┴ ┴┴ ┴┴   └┘ ┴└─┘└┴┘
//  SECTION: mapview
    if (mapview !== undefined) {
        // ERROR: mapview not an object
        if (typeof mapview !== 'object') {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview must be an object containing "columns" & "array" properties!`);
        }
        // ERROR: mapview.columns not a number (or undefined)
        else if (typeof mapview.columns !== 'number') {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview.columns must be a number!`);
        }
        // ERROR: mapview.array not an array (or undefined)
        else if (! Array.isArray(mapview.array)) {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview.array must be an array!`);
        }
        // ERROR: mapview.array not rectangular
        else if ((mapview.array.length ?? this_map.mapview?.array?.length) % (mapview.columns ?? this_map.mapview?.columns) !== 0) {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview.array must be rectangular (whole number multiple of mapview.columns)!`);
        }
        // WARNING: empty mapview.array
        if (mapview.array.length === 0) {
            console.warn(`${name} — Sleepymap "${mapname}" — mapview.array is empty!`);
        }
        this_map.mapview = mapview;
    }

//   ┌┬┐┌─┐┌─┐┌─┐┬─┐┌─┐┌─┐┌─┐
//   │││├─┤├─┘├─┤├┬┘├┤ ├─┤└─┐
//   ┴ ┴┴ ┴┴  ┴ ┴┴└─└─┘┴ ┴└─┘
//  SECTION: mapnodes
    if (mapnodes !== undefined) {
        // ERROR: mapnodes not an object
        if (typeof mapnodes !== 'object') {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapnodes must be an object!`);
        }
        for (const [id, mapnode] of Object.entries(mapnodes)) {
            // WARNING: non-extant mapnode for map
            if (this_map.mapnodes[id] === undefined) {
                console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${id}" not found!`);
                continue;
            }
            // WARNING: mapnode not an object
            else if (typeof mapnode !== 'object') {
                console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${id}" is not an object!`);
                continue;
            }

            // update valid keys in mapnodes
            for (const key in mapnode) {
                // WARNING: mapnode id is immutable
                if (key === 'id') {
                    console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${id}", id is immutable!`);
                    continue;
                }
                // WARNING: unknown mapnode update property
                // SYNC REMINDER: changing here requires changing mapnode creation fn
                else if (! ['name', 'type', 'tile'].includes(key)) {
                    console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${id}", unknown property "${key}" — only name, type, and tile are allowed!`);
                    continue;
                }
                this_map.mapnodes[id][key] = mapnode[key];
                if (key === 'type') {
                    exits_need_updating = true;
                }
            }
        }
    }
    // if exits / structure changed
    if (exits_need_updating) {
        update_exits({ mapname });
    }
    // update roses & mapviews
    $('#passages').trigger('Sleepymap:map_edited', { mapname });
}




// █████ █   █ ████   ████   ████ █████
// █      █ █  █   █ █    █ █     █
// ███     █   ████  █    █  ███  ███
// █      █ █  █     █    █     █ █
// █████ █   █ █      ████  ████  █████
// SECTION: expose functions

window.Sleepymap = {
    new_map,
    create_rose,
    update_rose,
    create_mapview,
    update_mapview,
    set_entity,
    set_scripts,
    begin_mapmove,
    get_map,
    edit_map,
    edit_exits,
};

})();
