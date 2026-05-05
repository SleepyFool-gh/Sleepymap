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
        show_names_on_mapview   : false,
    },
    // THIS IS REGEX MAGIC. MANIPULTE AT YOUR OWN RISK.
    barriers: {
        N       : /"/,                                          // match " character somewhere
        E       : /(?<=[a-zA-Z0-9][^\s]*)\|(?![a-zA-Z0-9])/,    // match | character on right side -->
        S       : /_/,                                          // match _ character somewhere
        W       : /(?<![a-zA-Z0-9])\|(?=[^\s]*[a-zA-Z0-9])/,    // match | character on <-- left side
        NE      : /(?<=[a-zA-Z0-9][^\s]*)\\(?![a-zA-Z0-9])/,    // match \ character on right side -->
        NW      : /(?<![a-zA-Z0-9])\/(?=[^\s]*[a-zA-Z0-9])/,    // match / character on <-- left side
        SE      : /(?<=[a-zA-Z0-9][^\s]*)\/(?![a-zA-Z0-9])/,    // match / character on right side -->
        SW      : /(?<![a-zA-Z0-9])\\(?=[^\s]*[a-zA-Z0-9])/,    // match \ character on <-- left side
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
    NW: 'SE',
    SE: 'NW',
    SW: 'NE',
};
// used in update_exits
const is_diagonal = {
    N   : false,
    E   : false,
    S   : false,
    W   : false,
    NE  : true,
    NW  : true,
    SE  : true,
    SW  : true,
};


// █    █ █████ █     █     █    █  ███  ████
// ██   █ █     █     █     ██  ██ █   █ █   █
// █ █  █ ███   █  █  █     █ ██ █ █████ ████
// █  █ █ █     █ █ █ █     █    █ █   █ █
// █   ██ █████  █   █      █    █ █   █ █
// SECTION: new_map function & macro wrapper
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants

// macro wrapper for new_map
Macro.add(['newmap', 'new_map'], {

    // child tags
    tags    :    ['mapview', 'mapvars', 'mapnodes'],

    handler() {

        const name = this.name;

        // ERROR: macro being called outside StoryInit
        if (turns() !== 0) {
            throw new Error(`${name} — macro must be called during StoryInit!`);
        }

        // parse args to argsObj
        const template_main = {
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
        };
        const argObj = new ArgObj(name, template_main, this.args);

        // create map array from payload
        argObj.maparray = this.payload[0].contents.trim().split(/\s+/g);

        // if <<mapview>> exists
        const payload_mapview = this.payload.find( p => p.name === 'mapview' );
        if (payload_mapview) {
            const args = payload_mapview.args;
            const template = {
                columns: {
                    required: true,
                    type: 'number',
                },
            }
            const argObj_mapview = new ArgObj(name, template, args);
            argObj.mapview = {
                columns: argObj_mapview.columns,
                array: payload_mapview.contents.trim().split(/\s+/g),
            };
        }

        // if <<mapnodes>> exists
        // should be an object of values to write into the node data when nodes are being generated
        const mapnodes = this.payload.find( p => p.name === 'mapnodes' )?.args[0]
        if (mapnodes) {
            // ERROR: args not an object
            if (typeof mapnodes !== 'object') {
                throw new Error(`${name} — <<mapnodes>> args must be an object!`);
            }
            argObj.mapnodes = mapnodes;
        }

        // if <<mapvars>> exists
        const payload_mapvars = this.payload.find( p => p.name === 'mapvars' );
        if (payload_mapvars) {
            const args = payload_mapvars.args;
            // SYNC REMINDER: changing here also requires changing MAPVAR_DEFAULTS
            const template = {
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
            const mapvars = new ArgObj('mapvars', template, args);
            argObj.mapvars = mapvars;
        }

        // call function
        new_map({
            ...argObj,
            name,
        });

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

    const { mapname, grid_movement, start, start_x, start_y, columns, mapview } = argObj;
    const diagonals = argObj.diagonals ?? options.default.diagonals;    // default value
    const name = argObj.name ?? 'Sleepymap.new_map';

    // ERROR: no map name or columns or map array provided
    if (mapname === undefined) {
        throw new Error(`${name} — no map name provided!`);
    }
    // ERROR: map with name already exists
    else if (maps[mapname]) {
        throw new Error(`${name} — Sleepymap with name "${mapname}" already exists!`);
    }
    // ERROR: columns not a number (or undefined)
    else if (typeof columns !== 'number') {
        throw new Error(`${name} — Sleepymap "${mapname}" — columns must be a number!`);
    }
    // ERROR: maparray not an array (or undefined)
    else if (! Array.isArray(argObj.maparray)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — maparray must be an array!`);
    }
    // ERROR: maparray not rectangular
    else if (argObj.maparray.length % columns !== 0) {
        throw new Error(`${name} — Sleepymap "${mapname}" — maparray must be rectangular (whole number multiple of columns)!`);
    }
    // ERROR: node map mode, invalid start
    else if ((! grid_movement) && (! argObj.maparray.includes(start))) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start mapnode "${start}" not found in maparray!`);
    }
    // ERROR: start_x and start_y required for gridmap mode
    else if (grid_movement && (start_x === undefined || start_y === undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start_x and start_y required for gridmap mode!`);
    }
    // ERROR: start_x out of bounds
    else if (grid_movement && (start_x < 0 || start_x >= columns)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start_x out of bounds!`);
    }
    // ERROR: start_y out of bounds
    else if (grid_movement && (start_y < 0 || start_y >= argObj.maparray.length / columns)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — start_y out of bounds!`);
    }
    // ERROR: grid movement is incompatible with separate mapview
    else if (grid_movement && mapview) {
        throw new Error(`${name} — Sleepymap "${mapname}" — grid movement is incompatible with a separate mapview!`);
    }

    // create map object
    const this_map = {
        mapname,
        columns,
        diagonals,
        grid_movement,
        maparray    : [],           // populated here, later
        barriers    : [],
        mapview     : undefined,    // populated here, later
        mapnodes    : {},           // populated here, later
        mapvars     : {},           // populated here, later
        exits       : {             // populated here, later
            node    : {},
            grid    : [],
        },
        scripts     : [],           // populated in set_scripts, if called
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
            NW  : options.barriers.NW.test(cell),
            SE  : options.barriers.SE.test(cell),
            SW  : options.barriers.SW.test(cell),
        }
        barriers.push(barrier);
        maparray.push(cell.replace(options.barriers.replace, ''));
    }
    this_map.maparray = maparray;
    this_map.barriers = barriers;


//     █    █  ███  ████  █   █ ███ █████ █     █
//     ██  ██ █   █ █   █ █   █  █  █     █     █
//     █ ██ █ █████ ████  █   █  █  ███   █  █  █
//     █    █ █   █ █      █ █   █  █     █ █ █ █
//     █    █ █   █ █       █   ███ █████  █   █
//      SECTION: mapview object on maps

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
        else if (mapview.array.length % mapview.columns !== 0) {
            throw new Error(`${name} — Sleepymap "${mapname}" — mapview.array must be rectangular (whole number multiple of mapview.columns)!`);
        }
        // WARNING: empty mapview.array
        else if (mapview.array.length === 0) {
            console.warn(`${name} — Sleepymap "${mapname}" — mapview.array is empty!`);
        }

        this_map.mapview = mapview;
    }


//     █    █  ███  ████   ███  ████  █████  ███   ████
//     ██  ██ █   █ █   █ █   █ █   █ █     █   █ █
//     █ ██ █ █████ ████  █████ ████  ███   █████  ███
//     █    █ █   █ █     █   █ █   █ █     █   █     █
//     █    █ █   █ █     █   █ █   █ █████ █   █ ████
//      SECTION: mapnodes
//      creates nodes based off any provided data & off the defaults
//      node, here, means a named region on the map represented by an id

    // ERROR: mapnodes not an object
    if (argObj.mapnodes && (typeof argObj.mapnodes !== 'object')) {
        throw new Error(`${name} — Sleepymap "${mapname}" — mapnodes not an object!`);
    }

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

    // ERROR: mapvars not an object
    if (argObj.mapvars && (typeof argObj.mapvars !== 'object')) {
        throw new Error(`${name} — Sleepymap "${mapname}" — mapvars not an object!`);
    }

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

    const { mapname } = argObj;
    const name = argObj.name ?? 'Sleepymap.update_exits';

    const this_map = maps[mapname];

    // ERROR: mapname missing
    if (mapname === undefined) {
        throw new Error(`${name} — mapname is required!`);
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
    exits.grid = [];
    // populate exits object
    for (let i = 0; i < maparray.length; i++) {

        // define checks for each direction
        const checks = {
            N   : i >= columns,
            E   : (i+1) % columns !== 0,
            S   : i < (maparray.length - columns),
            W   : i % columns !== 0,
            NE  : (i >= columns) && ((i+1) % columns !== 0),
            NW  : (i >= columns) && (i % columns !== 0),
            SE  : (i < (maparray.length - columns)) && ((i+1) % columns !== 0),
            SW  : (i < (maparray.length - columns)) && (i % columns !== 0),
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
            exits.grid[i] ??= new Set();
            exits.grid[i].add(i + offsets[dir]);
        }
    }
}



// ████   ████   ████ █████
// █   █ █    █ █     █
// ████  █    █  ███  ███
// █   █ █    █     █ █
// █   █  ████  ████  █████
// SECTION: rose for navigation

// macro wrapper, calls the create_rose function (which returns a $rose object)
// then attaches it to the macro output
Macro.add(['place_rose', 'placerose'], {
    handler() {
        const name = this.name;
        const template = {
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
            }
        };
        const argObj = new ArgObj(name, template, this.args);
        create_rose({
            ...argObj,
            name,
        }).appendTo(this.output);
    }
});

// creates a 3x3 grid of links for navigation in each direction
// returns a $rose jQuery element
function create_rose(argObj) {

    // get values, use default as needed
    const { mapname, background } = argObj;
    const autoupdate = argObj.autoupdate ?? options.default.autoupdate_rose;    // default value
    const name = argObj.name ?? 'Sleepymap.create_rose';

    const this_map = maps[mapname];

    // ERROR: no mapname provided
    if (mapname === undefined) {
        throw new Error(`${name} — no map name provided!`);
    }
    // ERROR: no map found
    else if (this_map === undefined) {
        throw new Error(`${name} — couldn't find map with name "${mapname}"!`);
    }

    const { grid_movement, columns, maparray, mapnodes, mapvars, exits } = this_map;

    const position      = State.variables[mapvars.position.slice(1)];
    const frozen        = mapvars.frozen !== undefined      
                            ? State.variables[mapvars.frozen.slice(1)] 
                            : false;
    const disabled      = mapvars.disabled !== undefined    
                            ? State.variables[mapvars.disabled.slice(1)] 
                            : null;
    const hidden        = mapvars.hidden   !== undefined    
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

    const offsets = get_offsets({ columns });
    
    // create each dir
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
            if (! exits.grid[mapindex]?.has(mapindex + offsets[dir])) {
                continue;
            }
            const mapnode = mapnodes[maparray[mapindex + offsets[dir]]];
            const xy = i2xy({ i: mapindex + offsets[dir], columns });
            $(document.createElement('a'))
                .addClass('macro-Sleepymap-link')
                .attr('data-dir', dir)
                .attr('data-mapnode-name', mapnode.name)
                .attr('data-mapnode', mapnode.id)
                .attr('data-x', xy.x)
                .attr('data-y', xy.y)
                .attr('disabled', disabled?.[mapnode.id] || frozen)
                .css({
                    visibility: hidden?.[mapnode.id] ? 'hidden' : '',
                })
                .html(dir)
                .appendTo($dir);
        }
        // node travel
        else {
            // if no exits in this direction for this mapnode, skip
            if (exits.node[position.mapnode][dir] === undefined) continue;

            // iterate through exits
            for (const id of exits.node[position.mapnode][dir]) {
                const mapnode = mapnodes[id];
                const $link = $(document.createElement('a'));
                $link
                    .addClass('macro-Sleepymap-link')
                    .attr('data-dir', dir)
                    .attr('data-mapnode-name', mapnode.name)
                    .attr('data-mapnode', id)
                    .attr('data-x', 'undefined')
                    .attr('data-y', 'undefined')
                    .attr('disabled', disabled?.[id] || frozen)
                    .css({
                        visibility: hidden?.[id] ? 'hidden' : '',
                    })
                    .html(mapnode.name)
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
        });
    });

    return $rose;
}

// manual update $rose function
// macro wrapper
Macro.add(['update_rose', 'updaterose'], {
    handler: function() {
        const name = this.name;
        const template = {
            selector: {
                required: true,
                type: 'string',
            },
        };
        const argObj = new ArgObj(name, template, this.args);
        update_rose({$rose: $(argObj.selector)});
    }
});
function update_rose(argObj) {
    const { $rose } = argObj;
    const name = 'Sleepymap.update_rose';

    // ERROR: $rose isn't a jQuery obj
    if (! ($rose instanceof jQuery)) {
        throw new Error(`${name} — $rose must be a jQuery instance!`);
    }
    // ERROR: empty jQuery instance
    else if ($rose.length === 0) {
        throw new Error(`${name} — $rose is empty!`);
    }
    
    // update rose using argObj stored on rose
    $rose.each( function() {
        if (! $(this).hasClass('macro-Sleepymap-rose')) {
            console.warn(`${name} — provided jQuery object is not a map rose!`);
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

// macro wrapper, creates & places mapview
Macro.add(['place_mapview', 'placemapview'], {
    handler: function() {
        const name = this.name;
        const template = {
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
            show_names: {
                type: 'boolean',
            },
        };
        const argObj = new ArgObj(name, template, this.args);
        create_mapview({
            ...argObj,
            name,
        }).appendTo(this.output);
    }
});

// returns map object
function create_mapview(argObj) {
    const { mapname, background } = argObj;
    const name = argObj.name ?? 'Sleepymap.create_mapview';
    const show_names    = argObj.show_names ?? options.default.show_names_on_mapview;   // default value
    const autoupdate    = argObj.autoupdate ?? options.default.autoupdate_mapview;      // default value
    const clickable     = argObj.clickable  ?? options.default.clickable_mapview;       // default value

    const this_map = maps[mapname];

    // ERROR: missing args
    if (mapname === undefined) {
        throw new Error(`${name} — missing required args mapname!`);
    }
    // ERROR: non-extant map
    else if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }

    const mapvars   = this_map.mapvars;
    const position  = State.variables[mapvars.position.slice(1)];
    const frozen    = mapvars.frozen !== undefined      
                        ? State.variables[mapvars.frozen.slice(1)] 
                        : false;
    const disabled  = mapvars.disabled !== undefined    
                        ? State.variables[mapvars.disabled.slice(1)] 
                        : null;
    const hidden    = mapvars.hidden   !== undefined    
                        ? State.variables[mapvars.hidden.slice(1)]   
                        : null;

    const { grid_movement, columns, maparray, mapnodes, exits } = this_map;
    
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

    // create & append tiles
    for (let i = 0; i < mapview.array.length; i++) {
        const id = mapview.array[i];
        const mapnode = mapnodes[id];

        // define traversability
        function is_traversable() {
            if (mapnode.type === 'wall') return false;
            if (grid_movement) {
                const mapindex = xy2i({ xy: position, columns });
                if (mapindex === i) return null;
                return exits.grid[mapindex]?.has(i);
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
            .wiki(
                ((mapnode.tile !== undefined) ? mapnode.tile : '') +
                (show_names ? `<span>${mapnode.name}</span>` : '')
            );
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
                target_x,
                target_y,
            });
        });
    }

    return $mapview;
}

// manual update mapview function
// macro wrapper
Macro.add(['update_mapview', 'updatemapview'], {
    handler: function() {
        const name = this.name;
        const template = {
            selector: {
                required: true,
                type: 'string',
            },
        };
        const argObj = new ArgObj(name, template, this.args);
        update_mapview({$mapview: $(argObj.selector)});
    }
});
function update_mapview(argObj) {
    const { $mapview } = argObj;
    const name = 'Sleepymap.update_mapview';

    // ERROR: $mapview isn't a jQuery obj
    if (! ($mapview instanceof jQuery)) {
        throw new Error(`${name} — $mapview must be a jQuery instance!`);
    }
    // ERROR: empty jQuery instance
    else if ($mapview.length === 0) {
        throw new Error(`${name} — $mapview is empty!`);
    }

    // update mapview using argObj stored on mapview
    $mapview.each( function() {
        if (! $(this).hasClass('macro-Sleepymap-mapview')) {
            console.warn(`${name} — provided jQuery object is not a map mapview!`);
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

// macro wrapper for set_scripts
Macro.add(['set_scripts','setscripts'], {

    tags: ['onmapattempt', 'onmapstart', 'onmapend', 'onmapabort'],

    handler() {

        const name = this.name;

        // ERROR: macro being called outside StoryInit
        if (turns() !== 0) {
            throw new Error(`${name} — macro must be called during StoryInit!`);
        }

        const template = {
            mapname: {
                required: true,
                type: 'string',
            },
        };
        const argObj = new ArgObj(name, template, this.args);
        const mapname = argObj.mapname;

        // parse each payload, push to array, attach to argObj
        const scripts = [];
        for(let i = 1; i < this.payload.length; i++) {
            const p = this.payload[i];
            // SYNC REMINDER: changing here requires also changing the for loop in set_scripts
            const template = {
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
            const argObj = new ArgObj(p.name, template, p.args);
            scripts.push({
                type: p.name,
                triggers: argObj,
                contents: p.contents,
            });
        }

        set_scripts({
            name,
            mapname,
            scripts,
        });
    }
});

// assigns scripts to map object on new_map macro object
function set_scripts(argObj) {
    const { mapname, scripts } = argObj;
    const name = argObj.name ?? 'Sleepymap.set_scripts';
    
    // ERROR: no map name provided
    if ((mapname === undefined) || (scripts === undefined)) {
        throw new Error(`${name} — missing required arguments!`);
    }
    
    const this_map = maps[mapname];
    
    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — couldn't find map with name "${mapname}"!`);
    }

    // error checking & object shaping
    for (const script of scripts) {
        // SYNC REMINDER: changing here also requires changing <<set_scripts>> args
        for (const arg of ['to', 'from', 'to_x', 'to_y', 'from_x', 'from_y']) {
            // arg not defined, set to any, continue
            if (! (arg in script.triggers)) {
                script.triggers[arg] = 'any';
                continue;
            }

            // wrap in array if not "any"
            script.triggers[arg] = script.triggers[arg] === 'any'
                                    ? 'any'
                                    : [script.triggers[arg]].flat();
                                    
            // ERROR: make sure each array element is a string
            if (script.triggers[arg] !== 'any') {
                script.triggers[arg].forEach( trigger => {
                    if (['to', 'from'].includes(arg) && typeof trigger !== 'string') {
                        throw new Error(`${name} — ${script.type} — Sleepymap ${mapname}, "${arg}" must be a string, array of strings, or keyword "any"`);
                    }
                    else if (typeof trigger !== 'number') {
                        throw new Error(`${name} — ${script.type} — Sleepymap ${mapname}, "${arg}" must be a number, array of numbers, or keyword "any"`);
                    }
                });
            }
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

// macro wrapper for begin_mapmove
Macro.add(['mapmove', 'map_move'], {
    handler() {
        const name = this.name;
        const template = {
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
        };
        const argObj = new ArgObj(name, template, this.args);
        begin_mapmove({
            ...argObj,
            name,
        });      
    }
});

// begins map movement procedure
function begin_mapmove(argObj) {

    const { mapname } = argObj;
    const force_abort = argObj.force_abort ?? false;    // default value
    const skip_scripts = argObj.skip_scripts ?? false;  // default value
    const name = argObj.name ?? 'Sleepymap.begin_mapmove';

    const this_map = maps[mapname];

    // ERROR: missing mapname
    if (mapname === undefined) {
        throw new Error(`${name} — missing required args, "mapname"!`);
    }
    // ERROR: map not found
    else if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }

    const { grid_movement, columns, maparray, mapvars } = this_map;

    // ERROR: no xy target provided
    if (grid_movement && (argObj.target_x === undefined || argObj.target_y === undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — this map uses grid movement, please provide "target_x" and "target_y"!`);
    }
    // ERROR: no mapnode target provided
    else if ((! grid_movement) && (argObj.target_mapnode === undefined)) {
        throw new Error(`${name} — Sleepymap "${mapname}" — this map uses node movement, please provide "target_mapnode"!`);
    }

    // WARNING: unused target mapnode provided
    if (grid_movement && argObj.target_mapnode) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses grid movement, "target_mapnode" will be ignored!`);
    }
    else if ((! grid_movement) && (argObj.target_x || argObj.target_y)) {
        console.warn(`${name} — Sleepymap "${mapname}" — this map uses node movement, "target_x" and "target_y" will be ignored!`);
    }

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

    const target_mapnode    = grid_movement 
                                ? maparray[xy2i({ xy: { x:argObj.target_x, y:argObj.target_y }, columns })] 
                                : argObj.target_mapnode;
    const targets = {
        mapnode : target_mapnode,
        xys     : grid_movement 
                    ? [{ x: argObj.target_x, y: argObj.target_y }]
                    : get_xys(target_mapnode),
    };

    const position          = State.variables[mapvars.position.slice(1)];
    const origin_mapnode    = position.mapnode;
    const origins = {
        mapnode : origin_mapnode,
        xys     : grid_movement
                    ? [{ x: position.x, y: position.y }]
                    : get_xys(origin_mapnode),
    };

    // fire began event
    $('#passages').trigger('Sleepymap:mapmove_began', { 
        mapname, 
        origins,
        targets,
        force_abort,
        skip_scripts,
    });

    // if skipping scripts, done
    if (skip_scripts) return;

    // check for any scripts to fire when beginning an attempt
    const scripts_attempt = this_map.scripts.filter(script => script.type === 'onmapattempt');
    for (const script of scripts_attempt) {
        // check if script applies to this location, if yes run
        if (
            (script.triggers.from === 'any' || script.triggers.from.includes(origins.mapnode)) &&
            (script.triggers.to === 'any'   || script.triggers.to.includes(targets.mapnode)) &&
            origins.xys.some( xy =>
                (script.triggers.from_x === 'any' || script.triggers.from_x.includes(xy.x)) &&
                (script.triggers.from_y === 'any' || script.triggers.from_y.includes(xy.y))
            ) &&
            targets.xys.some( xy =>
                (script.triggers.to_x === 'any' || script.triggers.to_x.includes(xy.x)) &&
                (script.triggers.to_y === 'any' || script.triggers.to_y.includes(xy.y))
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
                    (script.triggers.from === 'any' || script.triggers.from.includes(origins.mapnode)) &&
                    (script.triggers.to === 'any'   || script.triggers.to.includes(targets.mapnode)) &&
                    origins.xys.some( xy =>
                        (script.triggers.from_x === 'any' || script.triggers.from_x.includes(xy.x)) &&
                        (script.triggers.from_y === 'any' || script.triggers.from_y.includes(xy.y))
                    ) &&
                    targets.xys.some( xy =>
                        (script.triggers.to_x === 'any' || script.triggers.to_x.includes(xy.x)) &&
                        (script.triggers.to_y === 'any' || script.triggers.to_y.includes(xy.y))
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
                    (script.triggers.from === 'any' || script.triggers.from.includes(origins.mapnode)) &&
                    (script.triggers.to === 'any'   || script.triggers.to.includes(targets.mapnode)) &&
                    origins.xys.some( xy =>
                        (script.triggers.from_x === 'any' || script.triggers.from_x.includes(xy.x)) &&
                        (script.triggers.from_y === 'any' || script.triggers.from_y.includes(xy.y))
                    ) &&
                    targets.xys.some( xy =>
                        (script.triggers.to_x === 'any' || script.triggers.to_x.includes(xy.x)) &&
                        (script.triggers.to_y === 'any' || script.triggers.to_y.includes(xy.y))
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
                (script.triggers.from === 'any' || script.triggers.from.includes(origins.mapnode)) &&
                (script.triggers.to === 'any'   || script.triggers.to.includes(targets.mapnode)) &&
                origins.xys.some( xy =>
                    (script.triggers.from_x === 'any' || script.triggers.from_x.includes(xy.x)) &&
                    (script.triggers.from_y === 'any' || script.triggers.from_y.includes(xy.y))
                ) &&
                targets.xys.some( xy =>
                    (script.triggers.to_x === 'any' || script.triggers.to_x.includes(xy.x)) &&
                    (script.triggers.to_y === 'any' || script.triggers.to_y.includes(xy.y))
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

function xy2i(argObj) {
    const { xy, columns } = argObj;
    return xy.y * columns + xy.x;
}
function i2xy(argObj) {
    const { i, columns } = argObj;
    return { x: i % columns, y: Math.floor(i / columns) };
}
function get_offsets(argObj) {
    const { columns } = argObj;
    return {
        N   : -columns,
        E   : 1,
        S   : columns,
        W   : -1,
        NE  : -columns + 1,
        NW  : -columns - 1,
        SE  : columns + 1,
        SW  : columns - 1,
    };
}

function get_map(argObj) {
    const mapname = argObj.mapname;
    const name = 'Sleepymap.get_map';
    const this_map = maps[mapname];
    // ERROR: missing arg
    if (mapname === undefined) {
        throw new Error(`${name} — missing required mapname argument!`);
    }
    // ERROR: non-extant map
    else if (this_map === undefined) {
        throw new Error(`${name} — Sleepymap "${mapname}" not found!`);
    }
    return structuredClone(maps[mapname]);
}

function edit_map(argObj) {
    const { mapname, diagonals, columns, maparray, mapview, mapnodes } = argObj;
    const name = 'Sleepymap.edit_map';
    const this_map = maps[mapname];
    let exits_need_updating = false;

    // ERROR: missing arg
    if (mapname === undefined) {
        throw new Error(`${name} — missing required mapname argument!`);
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
        else if (mapview.array.length === 0) {
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
    set_scripts,
    begin_mapmove,
    get_map,
    edit_map,
};

})();
