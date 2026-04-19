//  ████  ████  █████ ███  ████  █    █  ████
// █    █ █   █   █    █  █    █ ██   █ █
// █    █ ████    █    █  █    █ █ █  █  ███
// █    █ █       █    █  █    █ █  █ █     █
//  ████  █       █   ███  ████  █   ██ ████
// SECTION: options

const options = {
    default: {
        wall_id                 : ".",
        diagonals               : false,
        position_story_variable : "@areamap/pos",
        rose_autoupdate         : true,
    }
}
setup['@areamap/options'] = options;




// █    █  ███   ████ ████   ████          ███  ████  █████  ███  █    █  ███  ████
// ██  ██ █   █ █     █   █ █    █        █   █ █   █ █     █   █ ██  ██ █   █ █   █
// █ ██ █ █████ █     ████  █    █        █████ ████  ███   █████ █ ██ █ █████ ████
// █    █ █   █ █     █   █ █    █        █   █ █   █ █     █   █ █    █ █   █ █
// █    █ █   █  ████ █   █  ████  ▄█     █   █ █   █ █████ █   █ █    █ █   █ █
// SECTION: macro, areamap
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants

Macro.add(['newareamap', 'new_areamap'], {

    // child tags
    tags    :    ['mapvars', 'mapareas'],

    // maps container
    maps    :    {},

    handler() {

        // ERROR: macro being called outside StoryInit
        if (! turns()) {
            return this.error(`${this.name} — macro must be called during StoryInit!`);
        }

        // parse args to argsObj
        const template_main = {
            mapname: {
                type: 'string',
            },
            columns: {
                type: 'number',
            },
            diagonals: {
                type: 'boolean',
            },
        };
        const argObj = new ArgObj(this.name, template_main, this.args);

        // create map array from payload
        argObj.maparray = this.payload[0].contents.trim().split(/\s+/g);

        // if <<mapareas>> exists
        // should be an object of values to write into the area data when areas are being generated
        const mapareas = this.payload.find( p => p.name === 'mapareas' )?.args[0]
        if (mapareas) {
            // ERROR: args not an object
            if (typeof mapareas !== 'object') {
                throw new Error('new_areamap — <<mapareas>> args must be an object!');
            }
            argObj.mapareas = mapareas;
        }

        // if <<mapvars>> exists
        const payload_mapvars = this.payload.find( p => p.name === 'mapvars' );
        if (payload_mapvars) {
            const args = payload_mapvars.args;
            const template = {
                position: {
                    required: true,
                    type: 'string',
                },
                origin: {
                    type: 'string',
                },
                target: {
                    type: 'string',
                },
                disabled: {
                    type: 'string',
                },
                hidden: {
                    type: 'string',
                },
                prevented: {
                    type: 'string',
                },
            };
            const mapvars = new ArgObj('mapvars', template, args);
            argObj.mapvars = mapvars;
        }

        // call function
        new_areamap(argObj);

    },
});

function new_areamap(argObj) {


//     █    █ █████ █     █  ███  ████  █████  ███  █    █  ███  ████
//     ██   █ █     █     █ █   █ █   █ █     █   █ ██  ██ █   █ █   █
//     █ █  █ ███   █  █  █ █████ ████  ███   █████ █ ██ █ █████ ████
//     █  █ █ █     █ █ █ █ █   █ █   █ █     █   █ █    █ █   █ █
//     █   ██ █████  █   █  █   █ █   █ █████ █   █ █    █ █   █ █
//      SECTION: newareamap
//      creates map object on the new_areamap macro

    const { mapname, columns, maparray } = argObj;
    const diagonals = argObj.diagonals ?? options.default.diagonals;    // default value

    const this_macro = Macro.get('new_areamap');

    // ERROR: no map name or columns or map array provided
    if (! mapname) {
        throw new Error('new_areamap — no map name provided!');
    }
    else if (! columns) {
        throw new Error(`new_areamap — areamap "${mapname}" — no columns provided!`);
    }
    else if (! maparray) {
        throw new Error(`new_areamap — areamap "${mapname}" — no array provided!`);
    }
    // ERROR: map with name already exists
    else if (this_macro.maps[mapname]) {
        throw new Error(`new_areamap — areamap with name "${mapname}" already exists!`)
    }
    // ERROR: maparray not an array
    else if (! Array.isArray(maparray)) {
        throw new Error(`new_areamap — areamap "${mapname}" — maparray must be an array!`);
    }
    // ERROR: maparray not rectangular
    else if (maparray.length % columns !== 0) {
        throw new Error(`new_areamap — areamap "${mapname}" — maparray must be rectangular (whole number multiple of columns)!`);
    }

    // create map object
    const this_map = {
        mapname,
        columns,
        maparray,
        diagonals,
    };
    this_macro.maps[mapname] = this_map;


//     █    █  ███  ████   ███  ████  █████  ███   ████
//     ██  ██ █   █ █   █ █   █ █   █ █     █   █ █
//     █ ██ █ █████ ████  █████ ████  ███   █████  ███
//     █    █ █   █ █     █   █ █   █ █     █   █     █
//     █    █ █   █ █     █   █ █   █ █████ █   █ ████
//      SECTION: mapareas
//      creates areas based off any provided data & off the defaults
//      area, here, means a named region on the map represented by an id

    // ERROR: mapareas not an object
    if (argObj.mapareas && (typeof argObj.mapareas !== 'object')) {
        throw new Error(`new_areamap — areamap "${mapname}" — mapareas not an object!`)
    }

    // create mapareas
    const mapareas = {};
    this_map.mapareas = mapareas;
    // take unique values from map array, create areas for each
    [...new Set(maparray)].forEach( function(id) {
        mapareas[id] = {
            id      : id,                                       // area identifier
            name    : argObj?.mapareas?.[id]?.name ?? id,       // name, use maparea name if found
            type    : argObj?.mapareas?.[id]?.type ?? 'floor',  // area type, use maparea type if found
        };
    });
    // overwrite with default wall
    {
        const id = options.default.wall_id;
        mapareas[id] = {
            id      : id,
            name    : argObj?.mapareas?.[id]?.name ?? id,
            type    : argObj?.mapareas?.[id]?.type ?? 'wall',
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
        throw new Error(`new_areamap — areamap "${mapname}" — mapvars not an object!`)
    }

    // create mapvars
    const mapvars = argObj.mapvars ?? {};
    mapvars.position ??= options.default.position_story_variable;
    this_map.mapvars = mapvars;

    const MAPVAR_KEYS = {
        position    : 'string',
        origin      : 'string',
        target      : 'string',
        disabled    : 'object',
        hidden      : 'object',
        prevented   : 'object'
    };
    for (const key of Object.keys(MAPVAR_KEYS)) {
        // mapvar key not defined, skip
        if (! (key in mapvars)) {
            continue;
        }

        // ERROR: mapvar value is not a string
        if (typeof mapvars[key] !== 'string') {
            throw new Error(`new_areamap — areamap "${mapname}" — mapvar only accepts strings!`);
        }
        // ERROR: mapvar value is not a story variable
        else if (mapvars[key].first() !== '$') {
            throw new Error(`new_areamap — areamap "${mapname}" — mapvar must be a story variable starting with "$"!`);
        }
        // WARNING: clobbering something
        if (State.getVar(mapvars[key]) !== undefined) {
            console.warn(`new_areamap — areamap "${mapname}" — something was clobbered while setting mapvar "${key}" at "${mapvars[key]}"!`);
        }

        // create default values to store into State
        // these just store an area id
        if (MAPVAR_KEYS[key] === 'string') {
            State.setVar(mapvars[key], null);
        }
        // these need to store a boolean for each area
        else {
            const mapvar = {};
            for (const area of Object.keys(mapareas)) {
                mapvar[area] = false;
            }
            State.setVar(mapvars[key], mapvar);
        }
    }


//     █████ █   █ ███ █████  ████
//     █      █ █   █    █   █
//     ███     █    █    █    ███
//     █      █ █   █    █       █
//     █████ █   █ ███   █   ████
//      SECTION: exits
//      backbone that checks exits for each area

    // create empty exits object
    const exits = {};
    this_map.exits = exits;
    Object.keys(mapareas).forEach( function(id) {
        exits[id] = {
            N   : new Set(),
            E   : new Set(),
            W   : new Set(),
            S   : new Set(),
            // won't be used if diagonals are disabled
            NW  : new Set(),
            NE  : new Set(),
            SE  : new Set(),
            SW  : new Set(),
        };
    });

    // populate exits object
    for (let i = 0; i < maparray.length; i++) {

        const maparea = mapareas[maparray[i]];

        // this map area is a wall, no need to find exits
        if (maparea.type === 'wall') {
            continue;
        }

        // define checks for each direction
        const checks = {
            N: {
                needed      : i >= columns,
                diagonal    : false,
                offset      : -columns,
            },
            E: {
                needed      : (i+1) % columns !== 0,
                diagonal    : false,
                offset      : 1,
            },
            S: {
                needed      : i < (maparray.length - columns),
                diagonal    : false,
                offset      : columns,
            },
            W: {
                needed      : i % columns !== 0,
                diagonal    : false,
                offset      : -1,
            },
            NE: {
                needed      : i >= columns && (i+1) % columns !== 0,
                diagonal    : true, 
                offset      : -columns + 1,
            },
            NW: {
                needed      : i >= columns && i % columns !== 0,
                diagonal    : true,
                offset      : -columns - 1,
            },
            SE: {
                needed      : i < (maparray.length - columns) && (i+1) % columns !== 0,
                diagonal    : true,
                offset      : columns + 1,
            },
            SW: {
                needed      : i < (maparray.length - columns) && i % columns !== 0,
                diagonal    : true,
                offset      : columns - 1,
            },
        };
        for (const [dir, check] of Object.entries(checks)) {
            // if check not needed, continue
            if (! check.needed) {
                continue;
            }
            // if dir is a diagonal and diagonals not enabled, continue
            if (check.diagonal && (! diagonals)) {
                continue;
            }
            // get neighbor
            // if neighbor is not this area and not a wall, add to exits
            const neighbor = mapareas[maparray[i + check.offset]];
            if (
                (neighbor.id !== maparea.id)   && 
                (neighbor.type !== 'wall')
            ) {
                exits[maparea.id][dir].add(neighbor.id);
            }
        }
    }
};




// █    █  ███   ████ ████   ████          ███  ████  █████  ███  ████   ████   ████ █████
// ██  ██ █   █ █     █   █ █    █        █   █ █   █ █     █   █ █   █ █    █ █     █
// █ ██ █ █████ █     ████  █    █        █████ ████  ███   █████ ████  █    █  ███  ███
// █    █ █   █ █     █   █ █    █        █   █ █   █ █     █   █ █   █ █    █     █ █
// █    █ █   █  ████ █   █  ████  ▄█     █   █ █   █ █████ █   █ █   █  ████  ████  █████
// SECTION: macro, arearose
// calls the create_arearose function (which returns a $rose object)
// then attaches it to the macro output

Macro.add(['place_arearose', 'placearearose'], {
    handler() {
        const template = {
            mapname: {
                required: true,
                type: 'string',
            },
            autoupdate: {
                type: 'boolean',
            },
        };
        const argObj = new ArgObj(this.name, template, this.args);
        create_arearose(argObj).appendTo(this.output);
    }
});


//      ████ ████  █████  ███  █████ █████        ███  ████  █████  ███  ████   ████   ████ █████
//     █     █   █ █     █   █   █   █           █   █ █   █ █     █   █ █   █ █    █ █     █
//     █     ████  ███   █████   █   ███         █████ ████  ███   █████ ████  █    █  ███  ███
//     █     █   █ █     █   █   █   █           █   █ █   █ █     █   █ █   █ █    █     █ █
//      ████ █   █ █████ █   █   █   █████ █████ █   █ █   █ █████ █   █ █   █  ████  ████  █████
//      SECTION: create_arearose
//      creates a 3x3 grid of links for navigation in each direction
//      returns a $rose jQuery element
function create_arealinks(argObj) {
    const { mapname, dir } = argObj;
    
    // ERROR: no mapname provided
    if (! mapname) {
        throw new Error(`create_arealinks — no map name provided!`)
    }
    else if (! dir) {
        throw new Error(`create_arealinks — map "${mapname}" — no direction provided!`)
    }
    
    const this_map = Macro.get('new_areamap').maps[mapname];
    
    // ERROR: no map found
    if (! this_map) {
        throw new Error(`create_arealinks — no map found with name "${mapname}"!`)
    }
    
    const { mapareas, mapvars, exits } = this_map;

    const position  = State.getVar(mapvars.position);
    const disabled  = mapvars.disabled ? State.getVar(mapvars.disabled) : null;
    const hidden    = mapvars.hidden   ? State.getVar(mapvars.hidden)   : null;

    // ERROR: invalid position, either not set or non-existing or a wall
    if (
        (position === null) ||
        (mapareas[position] === undefined) ||
        (mapareas[position].type === 'wall')
    ) {
        throw new Error(`create_arealinks — map "${mapname}" — position currently invalid!`)
    }

    const $dir = $(document.createElement('div'));
    $dir
        .addClass('macro-areamap-dir')
        .attr('data-mapname', mapname)
        .attr('data-dir', dir);

    for (const id of exits[position][dir]) {
        const maparea = mapareas[id];
        const $link = $(document.createElement('a'));
        $link
            .addClass('macro-areamap-link')
            .attr('data-id', id)
            .attr('data-dir', dir)
            .attr('data-area', maparea.name)
            .prop('disabled', !! disabled?.[id])
            .css({
                visibility: hidden?.[id] ? 'hidden' : 'visible',
            })
            .html(maparea.name)
            .appendTo($dir);
    }

    $dir.on('click', 'a', function() {
        const id = $(this).attr('data-id');
        State.setVar(mapvars.position, id);
        if (autoupdate) {
            update_areamap(mapname);
        }
    });
}
function create_arearose(argObj) {

    // get values, use default as needed
    const { mapname } = argObj;
    const autoupdate = argObj.autoupdate ?? options.default.rose_autoupdate;    // default value

    // ERROR: no mapname provided
    if (! mapname) {
        throw new Error(`create_arearose — no map name provided!`)
    }

    const this_map = Macro.get('new_areamap').maps[mapname];

    // ERROR: no map found
    if (! this_map) {
        throw new Error(`create_arearose — no map found with name "${mapname}"!`)
    }

    const { mapareas, mapvars, exits } = this_map;

    const position  = State.getVar(mapvars.position);
    const disabled  = mapvars.disabled ? State.getVar(mapvars.disabled) : null;
    const hidden    = mapvars.hidden   ? State.getVar(mapvars.hidden)   : null;

    // ERROR: invalid position, either not set or non-existing or a wall
    if (
        (position === null) ||
        (mapareas[position] === undefined) ||
        (mapareas[position].type === 'wall')
    ) {
        throw new Error(`create_arearose — map "${mapname}" — position currently invalid!`)
    }

    // create rose
    const $rose =   $(document.createElement('div'));
    $rose
        .addClass('macro-arearose')
        .attr('data-map', mapname);

    // create center
    $(document.createElement('div'))
        .addClass('macro-areamap-dir')
        .attr('data-id', position)
        .attr('data-dir', 'C')
        .html(mapareas[position].name)
        .appendTo($rose);

    // create each dir
    for (const dir of ['N', 'E', 'S', 'W', 'NE', 'NW', 'SE', 'SW']) {
        // create dir container
        const $dir  = $(document.createElement('div'));
        $dir
            .addClass('macro-areamap-dir')
            .attr('data-dir', dir)
            .appendTo($rose);

        // add links
        // diagonals will be empty if not enabled
        for (const id of exits[position][dir]) {
            const maparea = mapareas[id];
            const $link = $(document.createElement('a'));
            $link
                .addClass('macro-areamap-link')
                .attr('data-id', id)
                .attr('data-dir', dir)
                .attr('data-area', maparea.name)
                .prop('disabled', !! disabled?.[id])
                .css({
                    visibility: hidden?.[id] ? 'hidden' : 'visible',
                })
                .html(maparea.name)
                .appendTo($dir);
        }
    }

    $rose.on('click', '.macro-areamap-link', function(ev) {
        const id_target = $(ev.target).attr('data-id');
        begin_mapmove({
            mapname,
            id_target,
            abort: false,
        });
        if (autoupdate) {
            $rose.replaceWith(create_arearose(argObj));
        }
    });

    return $rose
}




// █    █  ███   ████ ████   ████          ███  ████  █████  ███   ████  ████ ████  ███ ████  █████  ████
// ██  ██ █   █ █     █   █ █    █        █   █ █   █ █     █   █ █     █     █   █  █  █   █   █   █
// █ ██ █ █████ █     ████  █    █        █████ ████  ███   █████  ███  █     ████   █  ████    █    ███
// █    █ █   █ █     █   █ █    █        █   █ █   █ █     █   █     █ █     █   █  █  █       █       █
// █    █ █   █  ████ █   █  ████  ▄█     █   █ █   █ █████ █   █ ████   ████ █   █ ███ █       █   ████
// SECTION: macro, areascripts
// macro sets scripts to run at various parts of the process:
//   when attempting, immediately, before success or failure is determined
//   when starting, before position updates
//   when ending, after position updates
//   when aborting

Macro.add(['set_areascripts','setareascripts'], {

    tags: ['onmapattempt', 'onmapstart', 'onmapend', 'onmapabort'],

    handler() {

        // ERROR: macro being called outside StoryInit
        if (! turns()) {
            return this.error(`${this.name} — macro must be called during StoryInit!`);
        }
        
        const template = {
            mapname: {
                required: true,
                type: 'string',
            },
        };
        const argObj = new ArgObj(this.name, template, this.args);
        const mapname = argObj.mapname;

        // ERROR: no map name provided
        if (! mapname) {
            throw new Error(`${this.name} — missing mapname argument`);
        }

        const scripts = [];
        for(let i = 1; i < this.payload.length; i++) {
            const p = this.payload[i];
            const template = {
                to: {
                    type: ['string', 'object'],
                },
                from: {
                    type: ['string', 'object'],
                },
            };
            const argObj = new ArgObj(p.name, template, p.args);
            scripts.push({
                type: p.name,
                areas: argObj,
                contents: p.contents,
            });
        }

        set_areascripts({
            mapname,
            scripts,
        });
    }
});

function set_areascripts(argObj) {
    const { mapname, scripts } = argObj;
    const this_map = Macro.get('new_areamap').maps[mapname];
    // error checking & object shaping
    for (const script of scripts) {
        for (const arg of ['to', 'from']) {
            // arg not defined, set to any, continue
            if (! (arg in script.areas)) {
                script.areas[arg] = 'any';
                continue;
            }

            // wrap in array if not "any"
            script.areas[arg]   = script.areas[arg] === 'any'
                                    ? 'any'
                                    : [script.areas[arg]].flat();
                                    
            // ERROR: make sure each array element is a string
            if (typeof script.areas[arg] !== 'string') {
                script.areas[arg].forEach( area => {
                    if (typeof area !== 'string') {
                        throw new Error(`set_areascripts — ${script.type} — map ${mapname}, "${arg}" must be a string, array of strings, or keyword "any"`);
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
//   then fires event off #passages, 
//   listener on document catches and calls resolve_mapmove
// resolve_mapmove checks if movement should continue
//   then updates to new position
//   fires ending event off #passages
// done this way to allow authors to intercept and manipulate if they like

// begins map movement procedure
function begin_mapmove(argObj) {

    const { mapname, id_target } = argObj;
    const abort = argObj.abort ?? false;    // default value

    const this_map = Macro.get('new_areamap').maps[mapname];
    const id_origin = State.getVar(this_map.mapvars.position);

    // fire began event
    $('#passages').trigger('areamap:mapmove_began', { mapname, id_origin, id_target, abort });

    // check for any scripts to fire when beginning an attempt
    const scripts_attempt = this_map.scripts.filter(script => script.type === 'onmapattempt');
    for (const script of scripts_attempt) {
        // check if script applies to this location, if yes run
        if (
            ((script.areas.from === 'any') || script.areas.from.includes(id_origin))    &&
            ((script.areas.to === 'any')   || script.areas.to.includes(id_target)) 
        ) {
            $.wiki(script.contents);
        }
    }
}

// document listener to catch events an resolve
$(document).on('areamap:mapmove_began', (event, argObj) => {
    resolve_mapmove(argObj);
});

// resolves map movement procedure
function resolve_mapmove(argObj) {
    const { mapname, id_target, abort } = argObj;
    const this_map = Macro.get('new_areamap').maps[mapname];
    const id_origin = State.getVar(this_map.mapvars.position);

    if (! abort) {
        // check for any onmapstart scripts
        const scripts_leave = this_map.scripts.filter(script => script.type === 'onmapstart');
        for (const script of scripts_leave) {
            // check if script applies to this location, if yes run
            if (
                ((script.areas.from === 'any') || script.areas.from.includes(id_origin))    &&
                ((script.areas.to === 'any')   || script.areas.to.includes(id_target)) 
            ) {
                $.wiki(script.contents);
            }
        }

        // enter new location
        State.setVar(this_map.mapvars.position, id_target);

        // check for any onmapend scripts
        const scripts_end = this_map.scripts.filter(script => script.type === 'onmapend');
        for (const script of scripts_end) {
            // check if script applies to this location, if yes run
            if (
                ((script.areas.from === 'any') || script.areas.from.includes(id_origin))    &&
                ((script.areas.to === 'any')   || script.areas.to.includes(id_target)) 
            ) {
                $.wiki(script.contents);
            }
        }
    }
    else {
        // check for any onmapabort scripts
        const scripts_abort = this_map.scripts.filter(script => script.type === 'onmapabort');
        for (const script of scripts_abort) {
            // check if script applies to this location, if yes run
            if (
                ((script.areas.from === 'any') || script.areas.from.includes(id_origin))    &&
                ((script.areas.to === 'any')   || script.areas.to.includes(id_target))  
            ) {
                $.wiki(script.contents);
            }
        }
    }
    
    // fire resolved event
    $('#passages').trigger('areamap:mapmove_resolved', { 
        mapname, 
        id_origin, 
        id_target, 
        succeeded: ! abort
    });
}

// █    █  ███   ████ ████   ████          ███  ████  █████  ███  █    █  ███  ████  █    █  ████  █   █ █████
// ██  ██ █   █ █     █   █ █    █        █   █ █   █ █     █   █ ██  ██ █   █ █   █ ██  ██ █    █ █   █ █
// █ ██ █ █████ █     ████  █    █        █████ ████  ███   █████ █ ██ █ █████ ████  █ ██ █ █    █ █   █ ███
// █    █ █   █ █     █   █ █    █        █   █ █   █ █     █   █ █    █ █   █ █     █    █ █    █  █ █  █
// █    █ █   █  ████ █   █  ████  ▄█     █   █ █   █ █████ █   █ █    █ █   █ █     █    █  ████    █   █████
// SECTION: macro, areamap_move
// wrapper for begin_mapmove
Macro.add(['areamapmove', 'areamap_move'], {
    handler() {
        const template = {
            mapname: {
                required: true,
                type: 'string',
            },
            id_target: {
                type: 'string',
                aliases: ['target','id', 'area'],
            },
            abort: {
                type: 'boolean',
            },
        };
        const argObj = new ArgObj(this.name, template, this.args);
        begin_mapmove(argObj);      
    }
});