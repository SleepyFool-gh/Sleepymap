(() => {

//  ████  ████  █████ ███  ████  █    █  ████
// █    █ █   █   █    █  █    █ ██   █ █
// █    █ ████    █    █  █    █ █ █  █  ███
// █    █ █       █    █  █    █ █  █ █     █
//  ████  █       █   ███  ████  █   ██ ████
// SECTION: options & other global constants

const options = {
    // various config settings which can all also be set when calling the macro / JS function
    default: {
        wall_id                  : '.',
        diagonals                : false,
        position_story_variable  : '$@Sleepymap/position',
        autoupdate_rose          : true,
        autoupdate_mapview       : true,
        clickable_mapview        : true,
        show_labels_on_mapview   : true,
        pathing_on_mapview       : true,
        enable_mapview_quickmove : true,
        pathmove_delay           : 250,
        disabled_stops_pathing   : true,
        hidden_stops_pathing     : true,
        blocked_stops_pathing    : false,
    },
    // shows on mapview & rose in grid_travel mode
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
    // State variable which holds the map data
    map_storage_story_variable  : '$@Sleepymap/maps',
    // regex magic for detecting barriers / thin walls. MANIPULTE AT YOUR OWN RISK.
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
// proxy required because SugarCube breaks references on passage navigation
State.variables[options.map_storage_story_variable] = {};
const maps = new Proxy({}, {
    get(target, prop) {
        return State.variables[options.map_storage_story_variable][prop];
    },
    set(target, prop, value) {
        State.variables[options.map_storage_story_variable][prop] = value;
        return true;
    }
});

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
// used to check valid_dirs
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
    grid_travel: {
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
    mapstates: {
        type: 'object',
    },
    mapnodes: {
        type: 'object',
    },
};
// macro wrapper for new_map
Macro.add(['new_map'], {

    tags: ['mapnodes'],

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

        // if <<mapnodes>> exists
        // should be an object of values to write into the node data when nodes are being generated
        const mapnodes = this.payload.find( p => p.name === 'mapnodes' )?.args[0]
        if (mapnodes) {
            argObj.mapnodes = mapnodes;
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
    // maparray, mapnodes need processing
    const { mapname, grid_travel, start, start_x, start_y, columns } = argObj;
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
    // ERROR: grid travel with wrong start arg
    else if (grid_travel && (start !== undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — "start" arg is only for node travel mode!`);
    }
    // ERROR: node travel with wrong start args
    else if ((! grid_travel) && ((start_x !== undefined) || (start_y !== undefined))) {
        throw new Error(`${name} — Sleepymap "${mapname}" — "start_x" and "start_y" args are only for grid travel mode!`);
    }
    // ERROR: node map mode, invalid start
    else if ((! grid_travel) && (! argObj.maparray.includes(start))) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start mapnode "${start}" not found in maparray!`);
    }
    // ERROR: start_x and start_y required for gridmap mode
    else if (grid_travel && (start_x === undefined || start_y === undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start_x and start_y required for gridmap mode!`);
    }
    // VALIDATE: xy bounds
    else if (grid_travel) {
        validate_bounds({ 
            name, 
            mapname, 
            columns, 
            maparray: argObj.maparray, 
            x: start_x, 
            y: start_y 
        });
    }

    // MAPNODE ERRORS
    // ERROR: mapnodes not an object
    if ((argObj.mapnodes !== undefined) && (typeof argObj.mapnodes !== 'object')) {
        throw new Error(`${name} — Sleepymap — mapnodes must be an object!`);
    }

    const this_map = {
        mapname,
        columns,
        diagonals,
        grid_travel,
        frozen          : false,
        maparray        : [],               // populated in new_map
        barriers        : [],               // populated in new_map
        mapnodes        : {},               // populated in new_map
        position        : {},               // populated in new_map
        exits           : {
            node    : {},
            grid    : [],
        },                                  // populated in update_exits
        scripts         : [],               // populated in set_mapscripts
        entities        : {},               // populated in set_entities
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


//     █    █  ███  ████  █    █  ████  ████  █████  ████
//     ██  ██ █   █ █   █ ██   █ █    █ █   █ █     █
//     █ ██ █ █████ ████  █ █  █ █    █ █   █ ███    ███
//     █    █ █   █ █     █  █ █ █    █ █   █ █         █
//     █    █ █   █ █     █   ██  ████  ████  █████ ████
//      SECTION: mapnodes
//      creates nodes based off any provided data & off the defaults
//      node, here, means a named region on the map represented by an id

    // create mapnodes
    const mapnodes = this_map.mapnodes;
    // take unique values from map array, create nodes for each
    [...new Set(maparray)].forEach( function(id) {
        // SYNC REMINDER: changing here also requires changing default wall below & set_mapnode & set_mapstate fn's
        mapnodes[id] = {
            id          : id,                                               // identifier
            name        : argObj.mapnodes?.[id]?.name       ?? id,          // displayed in rose
            tile        : argObj.mapnodes?.[id]?.tile       ?? undefined,   // printed on mapview
            disabled    : argObj.mapnodes?.[id]?.disabled   ?? false,       // stops interface interactions
            hidden      : argObj.mapnodes?.[id]?.hidden     ?? false,       // hides
            blocked     : argObj.mapnodes?.[id]?.blocked    ?? false,       // stops movement through
            walled      : argObj.mapnodes?.[id]?.walled     ?? false,       // becomes wall
        };
    });
    mapnodes[options.default.wall_id].walled = true;


//     ████   ████   ████ ███ █████ ███  ████  █    █
//     █   █ █    █ █      █    █    █  █    █ ██   █
//     ████  █    █  ███   █    █    █  █    █ █ █  █
//     █     █    █     █  █    █    █  █    █ █  █ █
//     █      ████  ████  ███   █   ███  ████  █   ██
//      SECTION: position

    const xy = { x: start_x, y: start_y };
    if (grid_travel) {
        this_map.position.mapnode = maparray[xy2i({ xy, columns })];
        this_map.position.x = start_x;
        this_map.position.y = start_y;
    }
    else {
        this_map.position.mapnode = start;
    }
    

//   ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐─┐ ┬┬┌┬┐┌─┐
//   │ │├─┘ ││├─┤ │ ├┤   ├┤ ┌┴┬┘│ │ └─┐
//   └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘┴ └─┴ ┴ └─┘
//  SECTION: update exits object
    update_exits({ mapname });
}




//  ████ █████ █████      ███  █████ █████     █    █  ███  ████  █    █  ████  ████  █████
// █     █       █       █     █       █       ██  ██ █   █ █   █ ██   █ █    █ █   █ █
//  ███  ███     █       █  ██ ███     █       █ ██ █ █████ ████  █ █  █ █    █ █   █ ███
//     █ █       █       █   █ █       █       █    █ █   █ █     █  █ █ █    █ █   █ █
// ████  █████   █        ███  █████   █       █    █ █   █ █     █   ██  ████  ████  █████
// SECTION: set / get mapnode
const SET_MAPNODE_TEMPLATE = {
    mapname: {
        type: 'string',
        required: true,
    },
    mapnode: {
        type: 'string',
        required: true,
    },
    data: {
        type: 'object',
        required: true,
    },
};
Macro.add(['set_mapnode'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, SET_MAPNODE_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        set_mapnode(argObj);
    }
});
function set_mapnode(argObj) {
    const name = argObj.name ?? 'Sleepymap.set_mapnode';

    // VALIDATE: required args & type
    ArgObj.validate(name, SET_MAPNODE_TEMPLATE, argObj);

    const { mapname, data } = argObj;
    const this_map = maps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }

    const { mapnodes } = this_map;
    if (mapnodes[argObj.mapnode] === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" — mapnode "${argObj.mapnode}" doesn't exist on map!`);
    }

    // SYNC REMINDER: updating here requires updating in new_map
    const MAPTILE_PROPS = {
        name: 'string',
        tile: 'string',
        disabled: 'boolean',
        hidden: 'boolean',
        blocked: 'boolean',
        walled: 'boolean',
    };
    let interfaces_need_updating = false;
    for (const prop in data) {
        // WARNING: not valid property, skip
        if (! Object.hasOwn(MAPTILE_PROPS, prop)) {
            console.warn(`${name} — Sleepymap "${mapname}" — "${prop}" is not a valid mapnode property, ignoring...`);
            continue;
        }
        // WARNING: invalid type, skip
        if (typeof data[prop] !== MAPTILE_PROPS[prop]) {
            console.warn(`${name} — Sleepymap "${mapname}" — "${prop}" is not of type "${MAPTILE_PROPS[prop]}", ignoring...`);
            continue;
        }
        mapnodes[argObj.mapnode][prop] = data[prop];
        interfaces_need_updating = true;
    }

    // update interfaces
    if (interfaces_need_updating) {
        setTimeout( () => $('#passages').trigger('Sleepymap:map_edited', { mapname }), Engine.DOM_DELAY);
    }
}
function get_mapnode(argObj) {
    const name = argObj.name ?? 'Sleepymap.get_mapnode';
    const { mapname } = argObj;
    const this_map = maps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }
    // ERROR: missing mapnode args
    else if (argObj.mapnode === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" — missing required args "mapnode"!`);
    }

    const { mapnodes } = this_map;
    if (mapnodes[argObj.mapnode] === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" — mapnode "${argObj.mapnode}" doesn't exist on map!`);
    }

    return structuredClone(mapnodes[argObj.mapnode]);
}




//  ████ █████ █████      ███  █████ █████     █    █  ███  ████   ████ █████  ███  █████ █████
// █     █       █       █     █       █       ██  ██ █   █ █   █ █       █   █   █   █   █
//  ███  ███     █       █  ██ ███     █       █ ██ █ █████ ████   ███    █   █████   █   ███
//     █ █       █       █   █ █       █       █    █ █   █ █         █   █   █   █   █   █
// ████  █████   █        ███  █████   █       █    █ █   █ █     ████    █   █   █   █   █████
// SECTION: set / get mapstate
// change things about the mapstate

const SET_MAPSTATE_TEMPLATE = {
    mapname: {
        type: 'string',
        required: true,
    },
    position: {
        type: 'object',
    },
    frozen: {
        type: 'boolean',
    },
    disabled: {
        type: 'object',
    },
    hidden: {
        type: 'object',
    },
    blocked: {
        type: 'object',
    },
    walled: {
        type: 'object',
    },
};
Macro.add(['set_mapstate'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, SET_MAPSTATE_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        set_mapstate(argObj);
    }
});
function set_mapstate(argObj) {
    const name = argObj.name ?? 'Sleepymap.set_mapstate';

    // VALIDATE: required args & type
    ArgObj.validate(name, SET_MAPSTATE_TEMPLATE, argObj);

    const { mapname } = argObj;
    const this_map = maps[mapname];

    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }
    // ERROR: no mapstate provided
    if (
        (! Object.hasOwn(argObj, 'position')) &&
        (! Object.hasOwn(argObj, 'frozen')) &&
        (! Object.hasOwn(argObj, 'disabled')) &&
        (! Object.hasOwn(argObj, 'hidden')) &&
        (! Object.hasOwn(argObj, 'blocked')) &&
        (! Object.hasOwn(argObj, 'walled'))
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — no mapstate provided!`);
    }

    const { grid_travel, columns, maparray, mapnodes } = this_map;

    // set position
    // NOTE: DOES NOT REFRESH INTERFACES OR CHECK AGAINST WALLS
    // grid travel
    if ((argObj.position !== undefined) && grid_travel) {
        // ERROR: incomplete position object
        if (argObj.position.x === undefined || argObj.position.y === undefined) {
            throw new Error(`${name} — Sleepymap "${mapname}" — incomplete position object for grid travel, needs both x & y!`);
        }
        // VALIDATE: bounds
        validate_bounds({ name, mapname, columns, maparray, x: argObj.position.x, y: argObj.position.y });
        // WARNING: unused mapnode input
        if (argObj.position.mapnode !== undefined) {
            console.warn(`${name} — Sleepymap "${mapname}" — this map uses grid travel, input mapnode "${argObj.position.mapnode}" ignored...`);
        }

        const xy = { x: argObj.position.x, y: argObj.position.y };
        const mapnode = maparray[xy2i({ xy, columns })];
        this_map.position.mapnode = mapnode;
        this_map.position.x = argObj.position.x;
        this_map.position.y = argObj.position.y;
    }
    // node travel
    else if (argObj.position !== undefined) {
        // ERROR: invalid position mapnode
        if (! maparray.includes(argObj.position?.mapnode)) {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapnode "${argObj.position?.mapnode}" not found in maparray!`);
        }
        this_map.position.mapnode = argObj.position.mapnode;
    }

    // set frozen state
    if (argObj.frozen !== undefined) {
        this_map.frozen = argObj.frozen;
    }

    // SYNC REMINDER: if changing here, need to change in SET_MAPSTATE_TEMPLATE, new_map, set_mapstate, & set_mapnode
    let interfaces_need_updating = false;
    for (const mapstate of ['disabled', 'hidden', 'blocked', 'walled']) {
        // no input, skip
        if (argObj[mapstate] === undefined) continue;

        const mapnode_ids = Object.keys(mapnodes);
        for (const mapnode_id in argObj[mapstate]) {
            // WARNING: non-extant mapnode input, skipped
            if (! mapnode_ids.includes(mapnode_id)) {
                console.warn(`${name} — Sleepymap "${mapname}" — mapstate input "${mapstate}", mapnode "${mapnode_id}" doesn't exist, ignoring...`);
                continue;
            }
            // WARNING: invalid mapstate input, skipped
            if (typeof argObj[mapstate][mapnode_id] !== 'boolean') {
                console.warn(`${name} — Sleepymap "${mapname}" — input for mapnode "${mapnode_id}" mapstate "${mapstate}" isn't a boolean, ignoring...`);
                continue;
            }
            mapnodes[mapnode_id][mapstate] = argObj[mapstate][mapnode_id];
            interfaces_need_updating = true;
        }
    }

    // update exits if walls changed
    if (argObj.walled !== undefined) {
        update_exits({ mapname });
    }
    // update interfaces
    if (interfaces_need_updating) {
        setTimeout( () => $('#passages').trigger('Sleepymap:map_edited', { mapname }), Engine.DOM_DELAY);
    }
}
function get_mapstate(argObj) {
    const name = argObj.name ?? 'Sleepymap.get_mapstate';
    const { mapname, mapstate } = argObj;

    const this_map = maps[mapname];

    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }
    // ERROR: no mapstate requested
    else if (mapstate === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" — mapstate args is required!`);
    }
    
    const { mapnodes } = this_map;
    // ERROR: invalid mapstate requested
    const valid_keys = Object.keys(SET_MAPSTATE_TEMPLATE).filter( k => k !== 'mapname' );
    if (! valid_keys.includes(mapstate)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — "${mapstate}" is not a valid mapstate to request!`);
    }

    // SYNC REMINDER: changing here requires changing in set_mapstate, SET_MAPSTATE_TEMPLATE, & edit_map? (TODO: review)
    // if position, sstructured clone needed to prevent mutation
    if (mapstate === 'position') {
        return structuredClone(this_map[mapstate]);
    }
    // if frozen
    else if (mapstate === 'frozen') {
        return this_map[mapstate];
    }
    // if something else
    // construct id2mapstate object
    const id2mapstate = {};
    for (const mapnode_id in mapnodes) {
        id2mapstate[mapnode_id] = mapnodes[mapnode_id][mapstate];
    }
    return id2mapstate;
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
        if (mapnode.walled) {
            continue;
        }
        for (const [dir, check] of Object.entries(checks)) {
            // if check not needed, skip
            if (! check) {
                continue;
            }
            // if dir is a diagonal and diagonals not enabled, skip
            else if (is_diagonal[dir] && (! diagonals)) {
                continue;
            }

            // get neighbor
            // if wall, skip
            const neighbor = mapnodes[maparray[i + offsets[dir]]];
            if (neighbor.walled) {
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
        // node travel
        if (Object.hasOwn(exit, 'from')) {
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
        // grid travel
        else {
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
    // JS property
    removing: {
        type: 'boolean',
    },
}
// wrapper for edit_exits
Macro.add(['connect_map', 'disconnect_map'], {
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

    // BASIC ERRORS
    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap — couldn't find map with name "${mapname}"!`);
    }
    // ERROR: invalid dir
    else if (! Object.hasOwn(is_diagonal, dir)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — invalid dir "${dir}", must be one of "N", "E", "S", "W", "NE", "SE", "SW", "NW"!`);
    }

    const { grid_travel, mapnodes, maparray, columns } = this_map;

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

    // WARNING: wrong inputs for travel type
    if (has_node_inputs && grid_travel) {
        console.warn(`${name} — Sleepymap "${mapname}" — this is a grid travel map, manually configured node exits will be non-functional!`);
    }
    if (has_grid_inputs && ! grid_travel) {
        console.warn(`${name} — Sleepymap "${mapname}" — this is a node travel map, manually configured grid exits will be non-functional!`);
    }
    // WARNING: connecting from a wall
    if (mapnodes[from_mapnode].walled) {
        console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${from_mapnode}" is a wall, this connection will be non-functional!`);
    }
    // WARNING: connecting to a wall
    if (mapnodes[to_mapnode].walled) {
        console.warn(`${name} — Sleepymap "${mapname}" — mapnode "${to_mapnode}" is a wall, this connection will be non-functional!`);
    }
    // WARNING: node input, connecting to self
    if (has_node_inputs && (from === to)) {
        console.warn(`${name} — Sleepymap "${mapname}" — connecting mapnode "${from_mapnode}" to itself is non-functional!`);
    }
    // WARNING grid input, connecting to self
    if (has_grid_inputs && (from_x === to_x && from_y === to_y)) {
        console.warn(`${name} — Sleepymap "${mapname}" — connecting grid position (${from_x}, ${from_y}) to itself is non-functional!`);
    }

    const exits = this_map.exits;
    // define manual exit
    const manual_exit   = from === undefined
                            ? { removing, dir, from_x, from_y, to_x, to_y }
                            : { removing, dir, from, to };
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
Macro.add(['place_rose'], {
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

    const { grid_travel, columns, maparray, mapnodes, position, frozen, exits } = this_map;
    const mapnode = mapnodes[position.mapnode];

    // create rose
    const $rose = $(document.createElement('div'))
        .addClass('macro-Sleepymap-rose')
        .attr('data-maptype', grid_travel ? 'grid' : 'node')
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
        const $dir  = $(document.createElement('div'))
            .addClass('macro-Sleepymap-dir')
            .attr('data-dir', dir)
            .appendTo($rose);

        // add links to rose
        // diagonals will be empty if not enabled
        // grid travel
        if (grid_travel) {
            const position_i = xy2i({ xy: position, columns });
            // if no exit in this direction, skip
            if (exits.grid[position_i][dir] === undefined) continue;
            
            for (const i of exits.grid[position_i][dir]) {
                const exit_mapnode = mapnodes[maparray[i]];

                // WARNING: skip corrupted nodes
                if (exit_mapnode === undefined) {
                    console.warn(`${name} — Sleepymap "${mapname}" — encountered invalid position_i "${i}" for direction "${dir}"`);
                    continue;
                }

                const xy = i2xy({ i, columns });
                // use dir label if same mapnode or if other mapnode's name is non-extant
                // else use mapnode name
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
                    .attr('disabled', exit_mapnode.disabled || frozen)
                    .css({ opacity: exit_mapnode.hidden ? '0' : '' })   // opacity instead of visibility because of mapview
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
                    .attr('disabled', exit_mapnode.disabled || frozen)
                    .css({
                        visibility: exit_mapnode.hidden ? 'hidden' : '',
                    })
                    .html(exit_mapnode.name)
                    .appendTo($dir);
            }
        }
    }

    // attach click listener
    attach_click({ name, mapname, $interface: $rose });

    return $rose;
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
    pathing: {
        type: 'boolean',
    },
    quickmove: {
        type: 'boolean',
    },
}
// macro wrapper, creates & places mapview
Macro.add(['place_mapview'], {
    handler() {
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
    // default values
    const show_labels   = argObj.show_labels ?? options.default.show_labels_on_mapview; 
    const autoupdate    = argObj.autoupdate  ?? options.default.autoupdate_mapview;
    const clickable     = argObj.clickable   ?? options.default.clickable_mapview;
    const quickmove     = argObj.quickmove   ?? options.default.enable_mapview_quickmove;
    const this_map = maps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }

    const { grid_travel, columns, maparray, mapnodes, position, frozen, exits, entities } = this_map;

    // WARNING: quickmove without pathing
    if (quickmove && (! argObj.pathing)) {
        console.warn(`${name} — Sleepymap "${mapname}" — quickmove without showing pathing isn't sensible!`);
    }
    // WARNING: pathing on node travel map
    if (argObj.pathing && (! grid_travel)) {
        console.warn(`${name} — Sleepymap "${mapname}" — pathing on node travel map isn't supported!`);
    }

    // force disable pathing on node travel maps
    const pathing = ! grid_travel
                        ? false
                        : argObj.pathing ?? options.default.pathing_on_mapview;
    
    // create map object
    // use maparray & columns if no mapview object
    const $mapview = $(document.createElement('div'))
        .addClass('macro-Sleepymap-mapview')
        .attr('data-maptype', grid_travel ? 'grid' : 'node')
        .attr('data-mapname', mapname)
        .attr('data-mapnode', position.mapnode)
        .attr('data-position-x', position.x)
        .attr('data-position-y', position.y)
        .attr('data-autoupdate', autoupdate)
        .data('argObj', argObj)
        .css({
            '--columns': columns,
        });
    
    // append bg
    if (background) {
        $(document.createElement('div'))
            .addClass('macro-Sleepymap-mapviewbg')
            .wiki(background)
            .appendTo($mapview);
    }

    // map out dirs to i's from exits
    const position_i = xy2i({ xy: position, columns });
    const i2dir = [];
    if (grid_travel) {
        for (const dir in exits.grid[position_i]) {
            const exit_is = exits.grid[position_i][dir];
            exit_is.forEach( i => i2dir[i] = dir );
        }
    }
    else {
        for (const dir in exits.node[position.mapnode]) {
            const exit_nodes = exits.node[position.mapnode][dir];
            for (const node of exit_nodes) {
                const exit_is = [];
                maparray.reduce( function(acc, el, i) {
                    if (el === node) exit_is.push(i);
                }, null);
                exit_is.forEach( i => i2dir[i] = dir );
            }
        }
    }
    // map out entities to i's
    const i2entity = [];
    for (const entityname in entities) {
        const entity = entities[entityname];
        const i = xy2i({ xy: { x: entity.x, y: entity.y }, columns });
        i2entity[i] ??= [];
        i2entity[i].push(entity.entityname);
    }

    // define traversability
    function is_traversable(i) {
        const id = maparray[i];
        const mapnode = mapnodes[id];

        // if walled, not traversable
        if (mapnode.walled || _pathmove_running) return false;

        // check exits dirs that at least one has target
        if (grid_travel) {
            return Object.values(exits.grid[position_i]).some( dir => dir.has(i) );
        }
        else {
            return Object.values(exits.node[position.mapnode]).some( dir => dir.has(id) );
        }
    }

    const $tiles = [];
    // create & append tiles
    for (let i = 0; i < maparray.length; i++) {
        const id = maparray[i];
        const mapnode = mapnodes[id];
        // if clickable & valid travel destination --> clickable
        const link  = ! (clickable || pathing)
                        ? false
                        : !! is_traversable(i);

        const xy = i2xy({ i, columns });
        // labels only work in grid mode
        const dir = i2dir[i];
        const label     = (! show_labels) || (! grid_travel) || (! is_traversable(i))
                            ? ''
                        // use labels if same room or if room name is non-extant
                        : (dir !== undefined) && ((position.mapnode === mapnode.id) || (mapnode.name === undefined))
                            ? `<span class='macro-Sleepymap-label'>${options.labels[dir]}</span>`
                        : `<span class='macro-Sleepymap-label'>${mapnode.name}</span>`;
        const $tile = $(document.createElement(link ? 'a' : 'div'))
            .addClass('macro-Sleepymap-tile')
            .addClass(link ? 'macro-Sleepymap-link' : '')
            .attr('data-traversable', is_traversable(i))
            .attr('data-current-position', grid_travel 
                ? (position.x === xy.x && position.y === xy.y)
                : mapnode.id === position.mapnode)
            .attr('data-dir', dir)
            .attr('data-mapnode-name', mapnode.name)
            .attr('data-mapnode', id)
            .attr('data-i', i)
            .attr('data-x', xy.x)
            .attr('data-y', xy.y)
            .attr('data-disabled', mapnode.disabled)
            .attr('disabled', mapnode.disabled || frozen)
            .attr('data-hidden', mapnode.hidden)
            .css({ opacity: mapnode.hidden ? '0' : '' }) // opacity instead of visibility because of onhover triggers
            .attr('data-blocked', mapnode.blocked)
            .attr('data-walled', mapnode.walled)
            // defined tile content +? mapnode name wrapped in a span
            .wiki(mapnode.tile ?? '')
            // print label
            .wiki(label)

        // print entities
        if (i2entity[i] !== undefined) {
            for (const entityname of i2entity[i]) {
                const entity = entities[entityname];
                $tile.wiki(`<span class='macro-Sleepymap-entity'>${entity?.tile ?? ''}</span>`);
            }
        }
        
        $mapview.append($tile);
        $tiles[i] = $tile;
    }

    // attach click listener, only if not pathing as that will replace it
    if (clickable && ! pathing) {
        attach_click({ name, mapname, $interface: $mapview });
    }
    // pathing always works, but hidden if not shown
    if (grid_travel) {
        let path;
        $mapview.on('mouseover', '.macro-Sleepymap-tile', function(ev) {
            const target_i = Number($(this).attr('data-i'));
            path = Sleepymap.find_path({
                mapname, 
                from_i  : position_i, 
                to_i    : target_i,
            });
            // show pathing if enabled and not pathmoving
            if (pathing && ! _pathmove_running) {
                // remove path class on all tiles
                $mapview[0]
                    .querySelectorAll('.macro-Sleepymap-path')
                    .forEach( el => el.classList.remove('macro-Sleepymap-path'));
                // add path class to each path tile
                for (let i = 0; i < path?.length; i++) {
                    $tiles[path[i]].addClass('macro-Sleepymap-path');
                }
            }
            // if quickmove enabled and not pathmoving
            if (quickmove && ! _pathmove_running) {
                // if path exists, movable
                $(this).removeClass('macro-Sleepymap-hoverlink');
                if (path) {
                    $(this).addClass('macro-Sleepymap-hoverlink');
                }
            }
        });
        // if quickmove enabled
        if (quickmove) {
            $mapview.on('click', '.macro-Sleepymap-tile', function(ev) {
                // if valid path
                if (path?.length > 1) begin_pathmove({ mapname, path });
            });
        }
        
    }

    return $mapview;
}




//  ████ ███ █    █ █████ █████ ████  █████  ███   ████ █████
// █ █    █  ██   █   █   █     █   █ █     █   █ █     █
//  ███   █  █ █  █   █   ███   ████  ███   █████ █     ███
//   █ █  █  █  █ █   █   █     █   █ █     █   █ █     █
// ████  ███ █   ██   █   █████ █   █ █     █   █  ████ █████
// SECTION: $interface things, updating

// ┌─┐┬ ┬┌┬┐┌─┐┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐
// ├─┤│ │ │ │ ││ │├─┘ ││├─┤ │ ├┤
// ┴ ┴└─┘ ┴ └─┘└─┘┴  ─┴┘┴ ┴ ┴ └─┘
// SECTION: autoupdate handler
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

// ┌┬┐┌─┐┌┐┌┬ ┬┌─┐┬    ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐
// │││├─┤││││ │├─┤│    │ │├─┘ ││├─┤ │ ├┤
// ┴ ┴┴ ┴┘└┘└─┘┴ ┴┴─┘  └─┘┴  ─┴┘┴ ┴ ┴ └─┘
// SECTION: manual update
const UPDATE_INTERFACE_TEMPLATE = {
    selector: {
        type: 'string',
    },
    $interface: {
        type: 'object',
        aliases: ['$rose', '$mapview', 'interface'],
    },
}
// macro wrapper
Macro.add(['update_interface'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, UPDATE_INTERFACE_TEMPLATE, this.args);
        argObj.$interface = $(argObj.selector);
        argObj.add_metadata('name', name);
        update_interface(argObj);
    }
});
// manually update interface item
function update_interface(argObj) {
    const name = 'Sleepymap.update_interface';

    // VALIDATE: required args & type
    ArgObj.validate(name, UPDATE_INTERFACE_TEMPLATE, argObj);
    // if $rose undefined, check for selector
    const $interface = argObj.$interface ?? (argObj.selector ? $(argObj.selector) : undefined);

    // ERROR: no input
    if ($interface === undefined) {
        throw new Error(`${name} — Sleepymap — no input provided!`);
    }
    // ERROR: input object isn't a jQuery instance
    else if (! ($interface instanceof jQuery)) {
        throw new Error(`${name} — Sleepymap — input object must be a jQuery instance!`);
    }
    // WARNING: empty jQuery instance
    if ($interface.length === 0) {
        console.warn(`${name} — Sleepymap — input is empty!`);
        return;
    }
    
    // update rose using argObj stored on rose
    $interface.each( function() {
        if ($(this).hasClass('macro-Sleepymap-rose')) {
            $(this).replaceWith(create_rose($(this).data('argObj')));
        }
        else if ($(this).hasClass('macro-Sleepymap-mapview')) {
            $(this).replaceWith(create_mapview($(this).data('argObj')));
        }
        else {
            console.warn(`${name} — Sleepymap — provided jQuery node isn't a Sleepymap interface item!`);
            console.warn($(this));
        }
    });
}

// ┌─┐┬  ┬┌─┐┬┌─
// │  │  ││  ├┴┐
// └─┘┴─┘┴└─┘┴ ┴
// SECTION: helper function to attach clicks
function attach_click(argObj) {
    const name = argObj.name ?? 'Sleepymap.attach_click';
    const { mapname, $interface } = argObj;
    $interface.on('click', '.macro-Sleepymap-link', function(ev) {
        // uses "this" because that is the element that matches the selector ^
        // whereas ev.target is the thing clicked, which maybe inside the matched element

        // link disabled, do nothing
        if ($(this).attr('disabled')) return;
        // pathmove running, do nothing
        if (_pathmove_running) return;

        // attempt move to target
        const target_mapnode    = $(this).attr('data-mapnode');
        const target_x          = Number($(this).attr('data-x'));
        const target_y          = Number($(this).attr('data-y'));
        const target_argObj = {
            mapname,
            target_mapnode,
            suppress_warnings: true,
        };
        // only define if valid numbers
        if (Number.isFinite(target_x)) target_argObj.target_x = target_x;
        if (Number.isFinite(target_y)) target_argObj.target_y = target_y;
        begin_mapmove(target_argObj);
    });
}

// ┬┌─┌─┐┬ ┬┌┬┐┌─┐┬ ┬┌┐┌
// ├┴┐├┤ └┬┘ │││ │││││││
// ┴ ┴└─┘ ┴ ─┴┘└─┘└┴┘┘└┘
// SECTION: keydown controller
const CREATE_CONTROLLER_TEMPLATE = {
    mapname: {
        type: 'string',
        required: true,
    },
    teleport: {
        type: 'boolean',
    },
    adjacent: {
        type: 'boolean',
    },
    keydown: {
        type: 'object',
        required: true,
    },
};
Macro.add(['place_controller'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, CREATE_CONTROLLER_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        create_controller(argObj).appendTo(this.output);
    }
});
// helper function to attach keydown
function create_controller(argObj) {
    const name = argObj.name ?? 'Sleepymap.attach_keydown';

    // VALIDATE: required args & type
    ArgObj.validate(name, CREATE_CONTROLLER_TEMPLATE, argObj);

    const { mapname, keydown, frozen, maptiles, exits } = argObj;
    const adjacent = argObj.adjacent ?? false;  // default value
    const this_map = maps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }

    const { grid_travel, columns, position } = this_map;

    const $controller = $(document.createElement('div'))
        .addClass('macro-Sleepymap-controller')
        .attr('data-maptype', grid_travel ? 'grid' : 'node')
        .attr('data-mapname', mapname)
        .attr('data-mapnode', position.mapnode)
        .attr('data-position-x', position.x)
        .attr('data-position-y', position.y);

    const namespace = `Sleepymap.${crypto.randomUUID()}`;

    // adjacent --> keys are dirs
    if (adjacent) {
        const keydown2dir = {};
        for (const dir in keydown) {
            // WARNING: not a valid dir, skipped
            if (! Object.hasOwn(is_diagonal, dir)) {
                console.warn(`${name} — Sleepymap "${mapname}" — keydown key "${dir}" is not a valid adjacent direction; ignored...`);
                continue;
            }
            const keys = [keydown[dir]].flat();
            console.log(keys);
            // flip object map
            for (const key of keys) {
                // WARNING: keydown key is not a string, skipped
                if (typeof key !== 'string') {
                    console.warn(`${name} — Sleepymap "${mapname}" — keydown value "${key}" is not a string; ignored...`);
                    continue;
                }
                keydown2dir[key] = dir;
            }
        }

        // create listener
        $(document).on(`keydown.${namespace}`, function(ev) {
            // if controller removed, delete listener
            if (! $.contains(document.body, $controller[0])) {
                $(document).off(`keydown.${namespace}`);
                return;
            }

            const dir = keydown2dir[ev.key] ?? keydown2dir[ev.keyCode];
            // frozen, do nothing
            if (frozen) return;
            // no match, do nothing
            else if (dir === undefined) return;
            
            // fetch first exit
            if (grid_travel) {
                const xy = { x: position.x, y: position.y };
                const mapindex = xy2i({ xy, columns });
                const exit_set = exits.node[mapindex][dir];
                const exit = exit = [...exit_set][0];
                // no exit, do nothing
                if (exit === undefined) return;
                const exit_xy = i2xy({ i: exit, columns });
                begin_mapmove({
                    mapname,
                    target_x: exit_xy.x,
                    target_y: exit_xy.y,
                    suppress_warnings: true,
                });Z
            }

        });
    }
    return $controller;
}


//     // build a reverse map, key value -> direction
//     const key_to_dir = {};
//     for (const [dir, keys] of Object.entries(keydown)) {
//         // WARNING: dir not a valid direction
//         if (! ['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW'].includes(dir)) {
//             console.warn(`${name} — Sleepymap "${mapname}" — keydown key "${dir}" is not a valid rose direction; ignored...`);
//             continue;
//         }
//         const key_arr = Array.isArray(keys) ? keys : [keys];
//         for (const k of key_arr) {
//             // WARNING: key is not a string
//             if (typeof k !== 'string') {
//                 console.warn(`${name} — Sleepymap "${mapname}" — keydown key "${k}" is not a string; ignored...`);
//                 continue;
//             }
//             key_to_dir[k] = dir;
//         }
//     }

//     // unique namespace so teardown only removes this listener

//     $(document).on(`keydown.${namespace}`, function(ev) {
//         // if interface item is no longer in the DOM, remove listener and bail
//         if (! $.contains(document.body, $interface[0])) {
//             $(document).off(`keydown.${namespace}`);
//             return;
//         }
//         // pathmove running, do nothing
//         if (_pathmove_running) return;
        
//         // match by key string first, then keyCode as fallback
//         const dir = key_to_dir[ev.key] ?? key_to_dir[ev.keyCode];
//         // no match, do nothing
//         if (dir === undefined) return;

//         // find the first enabled link in the target direction
//         const $link = $interface
//                         .find(`.macro-Sleepymap-link[data-dir="${dir}"]:not([disabled])`)
//                         .first();

//         // if link exists, trigger click
//         if ($link.length) {
//             ev.preventDefault();
//             $link.trigger('click');
//         }




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
    // JS properties
    removing: {
        type: 'boolean',
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
Macro.add(['new_entity', 'set_entity', 'delete_entity'], {
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
        console.warn(`${name} — Sleepymap "${mapname}" — removing entity, args "x", "y", and "tile" will be ignored...`)
    }

    const entities = this_map.entities;
    // WARNING: no tile
    if (entities[entityname]?.tile ?? tile === undefined) {
        console.warn(`${name} — Sleepymap "${mapname}" — entity "${entityname}" has no tile!`)
    }

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

    // update maps
    $('#passages').trigger('Sleepymap:map_edited', { mapname })
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

const SET_MAPSCRIPTS_TEMPLATE = {
    mapname: {
        required: true,
        type: 'string',
    },
    // JS property
    scripts: {
        type: 'object',
    },
};
// SYNC REMINDER: changing here requires also changing the for loop in set_mapscripts
const ONMAP_TRIGGERS_TEMPLATE = {
    from: {
        type: ['string', 'object'],
    },
    to: {
        type: ['string', 'object'],
    },
    from_x: {
        type: ['number', 'object'],
    },
    from_y: {
        type: ['number', 'object'],
    },
    to_x: {
        type: ['number', 'object'],
    },
    to_y: {
        type: ['number', 'object'],
    },
};
// macro wrapper for set_mapscripts
Macro.add(['set_mapscripts'], {

    tags: ['onmapattempt', 'onmapstart', 'onmapend', 'onmapabort', 'onmapresolve'],

    handler() {

        const name = this.name;

        // TODO: add ILIKETOBREAKTHINGS flag
        // ERROR: macro being called outside StoryInit
        if (turns() !== 0) {
            throw new Error(`${name} — Sleepymap — macro must be called during StoryInit!`);
        }

        const argObj = new ArgObj(name, SET_MAPSCRIPTS_TEMPLATE, this.args);

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
        set_mapscripts(argObj);
    }
});

// assigns scripts to map object on new_map macro object
function set_mapscripts(argObj) {
    const name = argObj.name ?? 'Sleepymap.set_mapscripts';

    // VALIDATE: required args & types
    ArgObj.validate(name, SET_MAPSCRIPTS_TEMPLATE, argObj);
    
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
        
        // SYNC REMINDER: changing here also requires changing <<set_mapscripts>> args
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
                if (['from', 'to'].includes(arg) && typeof trigger !== 'string') {
                    throw new Error(`${name} — ${script.type} — Sleepymap "${mapname}", "${arg}" must be a string, array of strings, or keyword "any"`);
                }
                // ERROR: make sure each from_x/from_y/to_x/to_y element is a number
                else if (['from_x', 'from_y', 'to_x', 'to_y'].includes(arg) && typeof trigger !== 'number') {
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
Macro.add(['mapmove'], {
    handler() {
        const name = this.name;
        const argObj = new ArgObj(name, BEGIN_MAPMOVE_TEMPLATE, this.args);
        argObj.add_metadata('name', name);
        begin_mapmove(argObj);      
    }
});

// aux function to check scripts & run them
// used in both begin_mapmove & resolve_mapmove
function run_mapscripts(argObj) {
    const { mapname, origins, targets, trigger } = argObj;
    const this_map = maps[mapname];
    // check for any onmapstart scripts
    const scripts = this_map.scripts.filter(script => script.type === trigger);
    for (const script of scripts) {
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

    const { grid_travel, columns, maparray, position, entities } = this_map;

    // WARNING: assumed arg because no xy
    if (
        (! suppress_warnings) && 
        grid_travel && 
        (argObj.target_x === undefined || argObj.target_y === undefined) && 
        (argObj.target_mapnode !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses grid travel, will use first "target_x" and "target_y" found!`);
    }
    // WARNING: assumed arg because no mapnode
    if (
        (! suppress_warnings) && 
        (! grid_travel) && 
        (argObj.target_mapnode === undefined) && 
        (argObj.target_x !== undefined && argObj.target_y !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses node travel, will use "target_mapnode" at xy coordinate!`);
    }
    // WARNING: extra mapnode args
    if (
        (! suppress_warnings) &&
        grid_travel && 
        (argObj.target_x !== undefined && argObj.target_y !== undefined) && 
        (argObj.target_mapnode !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses grid travel, "target_mapnode" will be ignored...`);
    }
    // WARNING: extra xy args
    if (
        (! suppress_warnings) &&
        (! grid_travel) && 
        (argObj.target_mapnode !== undefined) &&
        (argObj.target_x !== undefined && argObj.target_y !== undefined)
    ) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses node travel, "target_x" and "target_y" will be ignored...`);
    }

    // if grid travel && xy defined, use that to calculate mapnode — else use argObj mapnode
    // reverse for node travel
    const target_mapnode  = (
                                grid_travel && 
                                (argObj.target_x !== undefined) && (argObj.target_y !== undefined)
                            ) ||
                            (
                                (! grid_travel) &&
                                (argObj.target_mapnode === undefined)
                            )
                                ? maparray[xy2i({ xy: { x:argObj.target_x, y:argObj.target_y }, columns })] 
                                : argObj.target_mapnode;

    // aux function to fetch all valid xys
    function get_xys(mapnode) {
        const this_map = maps[mapname];
        const { maparray, columns } = this_map;
        const xys = [];
        for (let i = 0; i < maparray.length; i++) {
            if (maparray[i] === mapnode) {
                const xy = i2xy({ i, columns });
                xys.push(xy);
            }
        }
        return xys;
    }
    const target_xys = get_xys(target_mapnode);

    // WARNING: unplaced mapnode
    if (target_xys.length === 0) {
        console.warn(`${name} — Sleepymap "${mapname}" — no tiles exist for mapnode "${target_mapnode}", mapmove non-functional!`);
    }

    // if node travel or, grid travel && x undefined, fetch first — else use argObj x
    const target_x        = (! grid_travel) ||
                            (grid_travel && (argObj.target_x === undefined))
                                ? target_xys?.[0].x
                                : argObj.target_x;
    // if node travel or, grid travel && y undefined, fetch first — else use argObj y
    const target_y        = (! grid_travel) ||
                            (grid_travel && (argObj.target_y === undefined))
                                ? target_xys?.[0].y
                                : argObj.target_y;

    // if node travel, use all possible xys
    const targets = {
        mapnode     : target_mapnode,
        xys         : grid_travel 
                        ? [{ x: target_x, y: target_y }]
                        : target_xys,
        entities    : []
    };

    const origin_mapnode = position.mapnode;
    const origins = {
        mapnode     : origin_mapnode,
        xys         : grid_travel
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

    // check for any scripts to fire when beginning an attempt
    if (! skip_scripts) {;
        run_mapscripts({ mapname, origins, targets, trigger: 'onmapattempt' });
    }
    
    // fire began event
    $('#passages').trigger('Sleepymap:mapmove_began', { 
        mapname, 
        origins,
        targets,
        force_abort,
        skip_scripts,
    });
}

// document listener to catch events and resolve
$(document).on('Sleepymap:mapmove_began', (ev, argObj) => {
    resolve_mapmove(argObj);
});

// resolves map movement procedure
function resolve_mapmove(argObj) {
    const { mapname, origins, targets, force_abort, skip_scripts } = argObj;
    const name = argObj.name ?? 'Sleepymap.resolve_mapmove';

    const this_map = maps[mapname];
    const { grid_travel, mapnodes, position } = this_map;

    const target_mapnode = mapnodes[targets.mapnode];
    const succeeded = force_abort                                       // forced fail
                        ? false
                    : targets.xys.length === 0                          // nowhere to go
                        ? false
                    : target_mapnode.blocked || target_mapnode.walled   // walled or blocked
                        ? false
                    : true;
                            
    // mapmove succeeded
    if (succeeded) {
        if (! skip_scripts) {
            // check for any onmapstart scripts
            run_mapscripts({ mapname, origins, targets, triggr: 'onmapstart' });
        }

        if (grid_travel) {
            position.mapnode = targets.mapnode;
            position.x = targets.xys[0].x;
            position.y = targets.xys[0].y;
        }
        else {
            position.mapnode = targets.mapnode;
        }

        if (! skip_scripts) {
            // check for any onmapend scripts
            run_mapscripts({ mapname, origins, targets, trigger: 'onmapend' });
        }
    }
    // aborting
    else if (! skip_scripts) {
        // check for any onmapabort scripts
        run_mapscripts({ mapname, origins, targets, trigger: 'onmapabort' });
    }
    
    // fire resolved event
    // setTimeout as safety against race condition for scripts
    setTimeout( () => $('#passages').trigger('Sleepymap:mapmove_resolved', { 
        mapname, 
        origins, 
        targets,
        succeeded,
    }), Engine.DOM_DELAY);
}

let _pathmove_running = false;
function begin_pathmove(argObj) {
    const name = argObj.name ?? 'Sleepymap.begin_pathmove';

    // do nothing if pathmove running
    if (_pathmove_running) return;

    const { mapname, path } = argObj;
    // default values
    const skip_scripts      = argObj.skip_scripts ?? false;
    const suppress_warnings = argObj.suppress_warnings ?? false;
    const pathmove_delay    = argObj.pathmove_delay ?? options.default.pathmove_delay;

    const this_map = maps[mapname];

    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }
    // WARNING: empty path, exit
    else if (path === null || path === undefined) {
        if (! suppress_warnings) {
            console.warn(`${name} — Sleepymap "${mapname}" — path is empty, nothing to do; ABORTED`);
        }
        return;
    }
    // WARNING: no movement required for path, exit
    else if (path?.length <= 1) {
        if (! suppress_warnings) {
            console.warn(`${name} — Sleepymap "${mapname}" — path is not long enough to require moving, nothing to do; ABORTED`);
        }
        return;
    }
    // ERROR: path not an array
    else if (! Array.isArray(path)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — "path" must be an array!`);
    }

    const { columns } = this_map;

    _pathmove_running = true;
    // recursive fn to execute each step
    function execute_step(i) {
        const step = path[i];

        // path might be in i or xy
        let target_x, target_y;
        if (typeof step === 'number') {
            ({ x: target_x, y: target_y } = i2xy({ i: step, columns }));
        }
        else {
            ({ x: target_x, y: target_y } = step);
        }
        
        // attach listener for next step if needed
        if (path.length > i+1) {
            $(document).one('Sleepymap:mapmove_resolved', (ev, data) => {
                // only proceed to next step if succeeded
                if (data.succeeded) {
                    setTimeout( () => execute_step(i+1), pathmove_delay);
                }
                // unlock if not
                else {
                    _pathmove_running = false;
                }
            })
        }
        // unlock if not
        else {
            _pathmove_running = false;
        }

        begin_mapmove({
            mapname, 
            skip_scripts, 
            target_x, 
            target_y, 
            suppress_warnings,
        });
    }

    // start recursion
    execute_step(1);
}



// ████   ███  █████ █   █ ███ █    █  ███
// █   █ █   █   █   █   █  █  ██   █ █
// ████  █████   █   █████  █  █ █  █ █  ██
// █     █   █   █   █   █  █  █  █ █ █   █
// █     █   █   █   █   █ ███ █   ██  ███
// SECTION: pathing
// TODO: make hidden block pathing?
function find_path(argObj) {
 
    const name = argObj.name ?? 'Sleepymap.find_path';
    const { mapname, from_i, to_i, from_x, from_y, to_x, to_y } = argObj;
    const stopped_by_disabled   = argObj.stopped_by_disabled    ?? options.default.disabled_stops_pathing;
    const stopped_by_hidden     = argObj.stopped_by_hidden      ?? options.default.hidden_stops_pathing;
    const stopped_by_blocked    = argObj.stopped_by_blocked     ?? options.default.blocked_stops_pathing;
    const this_map = maps[mapname];
 
    const has_i_inputs = from_i !== undefined || to_i !== undefined;
    const has_xy_inputs = from_x !== undefined || from_y !== undefined || to_x !== undefined || to_y !== undefined;

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }
    // ERROR: mixed inputs
    else if (has_i_inputs && has_xy_inputs) {
        throw new Error(`${name} — Sleepymap "${mapname}" — can't have both i & xy inputs!`);
    }
    // ERROR: insufficient inputs
    else if (
        (has_i_inputs && (from_i === undefined || to_i === undefined)) ||
        (has_xy_inputs && (from_x === undefined || from_y === undefined || to_x === undefined || to_y === undefined))
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — insufficient inputs, need both from_i/to_i or, all of from_x/from_y/to_x/to_y!`);
    }
 
    const { exits, maparray, columns, mapnodes } = this_map;
    const start_i   = from_i ?? xy2i({ xy: { x: from_x, y: from_y }, columns });
    const end_i     = to_i   ?? xy2i({ xy: { x: to_x, y: to_y }, columns });
 
    const end_mapnode = mapnodes[maparray[end_i]];

    // TRIVIAL CASES
    // start & end same
    if (start_i === end_i) {
        return [start_i];
    }
    // end node is a stopping mapstate
    else if (
        (end_mapnode.disabled && stopped_by_disabled)   ||
        (end_mapnode.hidden && stopped_by_hidden)       ||
        (end_mapnode.blocked && stopped_by_blocked)
    ) return null;
 
    // BFS
    // came_from[i] = the index we arrived at i from (-1 sentinel for start)
    const came_from = new Array(maparray.length).fill(undefined);
    came_from[start_i] = -1;
 
    const queue = [start_i];
    let head = 0;               // head of snake
 
    bfs: while (head < queue.length) {
 
        const current_i = queue[head];
        head++;

        // prevent pathing through stopping mapstates
        const current_mapnode = mapnodes[maparray[current_i]];
        if (
            (current_mapnode.disabled && stopped_by_disabled)   ||
            (current_mapnode.hidden && stopped_by_hidden)       ||
            (current_mapnode.blocked && stopped_by_blocked)
        ) continue;
 
        // searches if this thing is destination, if not pushes its exits into queue
        for (const dirs of Object.values(exits.grid[current_i])) {
            for (const neighbor_i of dirs) {
 
                // already visited, skip
                if (came_from[neighbor_i] !== undefined) continue;
                // add step in path
                came_from[neighbor_i] = current_i;
 
                // destination reached — reconstruct path immediately
                if (neighbor_i === end_i) {
                    break bfs;
                }
 
                // push this thing's exits into queue
                queue.push(neighbor_i);
            }
        }
    }
 
    // end_i was never reached
    if (came_from[end_i] === undefined) return null;
 
    // RECONSTRUCT PATH (walk backwards through came_from, then reverse array)
    const path = [];
    let step = end_i;
    while (step !== -1) {
        // convert to xy if input was xy
        if (has_xy_inputs) {
            path.push(i2xy({ i: step, columns }));
        }
        else {
            path.push(step);
        }
        step = came_from[step];
    }
    path.reverse();
 
    return path;
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
    }
}

// exposed helpers
// edit the map object
function set_map(argObj) {
    const name = 'Sleepymap.set_map';
    const { mapname } = argObj;
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
    if (argObj.diagonals !== undefined) {
        // ERROR: diagonals not boolean
        if (typeof argObj.diagonals !== 'boolean') {
            throw new Error(`${name} — Sleepymap "${mapname}" — diagonals must be a boolean!`);
        }
        this_map.diagonals = argObj.diagonals;
        exits_need_updating = true;
    }

//   ┌─┐┌─┐┬  ┬ ┬┌┬┐┌┐┌┌─┐   ┬   ┌┬┐┌─┐┌─┐┌─┐┬─┐┬─┐┌─┐┬ ┬
//   │  │ ││  │ │││││││└─┐  ┌┼─  │││├─┤├─┘├─┤├┬┘├┬┘├─┤└┬┘
//   └─┘└─┘┴─┘└─┘┴ ┴┘└┘└─┘  └┘   ┴ ┴┴ ┴┴  ┴ ┴┴└─┴└─┴ ┴ ┴
//  SECTION: columns & maparray
    // ERROR: columns not a number
    if ((argObj.columns !== undefined) && (typeof argObj.columns !== 'number')) {
        throw new Error(`${name} — Sleepymap "${mapname}" — columns must be a number!`);
    }
    // ERROR: maparray not an array (or undefined)
    else if ((argObj.maparray !== undefined) && (! Array.isArray(argObj.maparray)) 
    ) {
        throw new Error(`${name} — Sleepymap "${mapname}" — maparray must be an array!`);
    }
    if ((argObj.columns !== undefined) || (argObj.maparray !== undefined)) {
        // ERROR: maparray not rectangular
        if (
            (argObj.maparray?.length ?? this_map.maparray.length) % 
            (argObj.columns ?? this_map.columns) !== 0
        ) {
            throw new Error(`${name} — Sleepymap "${mapname}" — new columns or maparray would break rectangularity!`);
        }
        this_map.columns = argObj.columns ?? this_map.columns;
        this_map.maparray = argObj.maparray ?? this_map.maparray;
        exits_need_updating = true;
    }


    // if exits / structure changed
    if (exits_need_updating) {
        update_exits({ mapname });
    }
    // update roses & mapviews
    $('#passages').trigger('Sleepymap:map_edited', { mapname });
}
// fetch a clone of map object
function get_map(argObj) {
    const name = 'Sleepymap.get_map';
    const mapname = argObj.mapname;
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



//  ████ █     █████ █████ ████  █   █ █    █  ███  ████
// █     █     █     █     █   █  █ █  ██  ██ █   █ █   █
//  ███  █     ███   ███   ████    █   █ ██ █ █████ ████
//     █ █     █     █     █       █   █    █ █   █ █
// ████  █████ █████ █████ █       █   █    █ █   █ █
// SECTION: Sleepymap
// class object to save things to State & to access various exposed functions
// class needed to write each property directly to State because SugarCube breaks references on passage navigation
const Sleepymap = {
    new_map,

    set_map,
    get_map,

    edit_exits,

    set_mapstate,
    get_mapstate,
    set_mapnode,
    get_mapnode,

    set_entity,
    set_mapscripts,


    begin_mapmove,

    create_rose,
    create_mapview,
    update_interface,
    find_path,
};
window.Sleepymap = Sleepymap;


})();


