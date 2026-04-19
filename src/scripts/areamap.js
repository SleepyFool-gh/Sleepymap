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
        if (this.payload.filter( p => p.name === 'mapareas' ).length) {
            const args = this.payload.filter( p => p.name === 'mapareas' )[0].args;
            // ERROR: args not an object
            if (typeof args !== 'object') {
                throw new Error('new_areamap — <<mapareas>> args must be an object!');
            }
            argObj.mapareas = args[0];
        }

        // if <<mapvars>> exists
        if (this.payload.filter( p => p.name === 'mapvars').length) {
            const args = this.payload.filter( p => p.name === 'mapvars' )[0].args;
            // if only one input, it is position
            if (args.length === 1) {
                argObj.mapvars = { position: args[0] };
            }
            // else parse inputs
            else {
                const template_mapvars = {
                    position: {
                        required: true,
                        type: 'string',
                    },
                    entering: {
                        type: 'string',
                    },
                    leaving: {
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
                const argObj_mapvars = new ArgObj('mapvars', template_mapvars, args);
                argObj.mapvars = argObj_mapvars;
            }
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

    const { mapname, columns, maparray }= argObj;
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

    // create map object
    const this_map = {
        mapname,
        columns,
        maparray,
        diagonals   : argObj.diagonals   ?? options.default.diagonals,  // use default if nullish
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
            id      : id,                            // area identifier
            name    : argObj?.mapareas?.[id]?.name ?? id,      // name, use maparea name if found
            type    : argObj?.mapareas?.[id]?.type ?? 'floor', // area type, use maparea type if found
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

    for (const key of ['position', 'entering', 'leaving', 'disabled', 'hidden', 'prevented']) {
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
        if (State.getVar(mapvars[key])) {
            console.warn(`new_areamap — areamap "${mapname}" — something was clobbered while setting mapvar "${key}" at "${mapvars[key]}"!`);
        }

        // these just store data about one specific area
        if (['position', 'entering', 'leaving'].includes(key)) {
            State.setVar(mapvars[key], null);
        }
        // disabled, hidden, and prevented need to store information about each area
        else {
            const mapvar = {};
            // fill with default values
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

        // if not first row, check north
        if (i >= columns) {
            // if not this area and not a wall
            const maparea_N = mapareas[maparray[i-columns]];
            if (
                (maparea_N.id !== maparea.id)  &&
                (maparea_N.type !== 'wall')
            ) {
                exits[maparea.id].N.add(maparea_N.id);
            }
        }
        // if not last column, check east
        if ((i+1) % columns) {
            const maparea_E = mapareas[maparray[i+1]];
            if (
                (maparea_E.id !== maparea.id)  &&
                (maparea_E.type !== 'wall')
            ) {
                exits[maparea.id].E.add(maparea_E.id);
            }
        }
        // if not last row, check south
        if (i < (maparray.length - columns)) {
            const maparea_S = mapareas[maparray[i+columns]];
            if (
                (maparea_S.id !== maparea.id)  &&
                (maparea_S.type !== 'wall')
            ) {
                exits[maparea.id].S.add(maparea_S.id);
            }
        }
        //if not first column, check west
        if (i % columns) {
            const maparea_W = mapareas[maparray[i-1]];
            if (
                (maparea_W.id !== maparea.id)  &&
                (maparea_W.type !== 'wall')
            ) {
                exits[maparea.id].W.add(maparea_W.id);
            }
        }

        // extra handling for diagonals
        if (this_map.diagonals) {

            // if not first row and not first column, check northwest
            if (
                (i >= columns) && 
                (i % columns)
            ) {
                const maparea_NW = mapareas[maparray[i-columns-1]];
                if (
                    (maparea_NW.id !== maparea.id) &&
                    (maparea_NW.type !== 'wall')
                ) {
                    exits[maparea.id].NW.add(maparea_NW.id);
                }
            }
            // if not first row and not last column, check northeast
            if (
                (i >= columns) && 
                ((i+1) % columns)
            ) {
                const maparea_NE = mapareas[maparray[i-columns+1]];
                if (
                    (maparea_NE.id !== maparea.id) &&
                    (maparea_NE.type !== 'wall')
                ) {
                    exits[maparea.id].NE.add(maparea_NE.id);
                }
            }
            // if not last row and not last column, check southeast
            if (
                (i < (maparray.length - columns)) && 
                ((i+1) % columns)
            ) {
                const maparea_SE = mapareas[maparray[i+columns+1]];
                if (
                    (maparea_SE.id !== maparea.id) &&
                    (maparea_SE.type !== 'wall')
                ) {
                    exits[maparea.id].SE.add(maparea_SE.id);
                }
            }
            // if not last row and not first column, check southwest
            if (
                (i < (maparray.length - columns)) && 
                (i % columns)
            ) {
                const maparea_SW = mapareas[maparray[i+columns-1]];
                if (
                    (maparea_SW.id !== maparea.id) &&
                    (maparea_SW.type !== 'wall')
                ) {
                    exits[maparea.id].SW.add(maparea_SW.id);
                }
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
        }
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

function create_arearose(argObj) {

    // get values, use default as needed
    const { mapname, autoupdate } = {
        autoupdate: options.default.rose_autoupdate,    // default value
        ...argObj
    };
    // ERROR: no mapname provided
    if (! mapname) {
        throw new Error(`create_arearose — no map name provided!`)
    }

    const this_map = Macro.get('new_areamap').maps[mapname];
    const { mapareas, mapvars, exits } = this_map;

    const position  = State.getVar(mapvars.position);
    const disabled  = State.getVar(mapvars.disabled);
    const hidden    = State.getVar(mapvars.hidden);

    // create rose
    const $rose =   $(document.createElement('div'));
    $rose
        .addClass('macro-arearose')
        .attr('data-map', mapname);

    // create center
    const $center   = $(document.createElement('div'));
    $center
            .addClass('macro-arearose-dir')
            .attr('data-id', position)
            .attr('data-dir', 'C')
            .html(mapareas[position]?.name)
            .appendTo($rose)

    // create each dir
    const dirs  = ['N', 'E', 'S', 'W', 'NE', 'NW', 'SE', 'SW'];
    for (const dir of dirs) {
        // create dir container
        const $dir  = $(document.createElement('div'));
        $dir
            .addClass('macro-arearose-dir')
            .attr('data-dir', dir)
            .appendTo($rose);

        // add links
        // diagonals will be empty if not enabled
        for (const id of exits[position][dir]) {
            const maparea = mapareas[id];
            const $link = $(document.createElement('a'));
            $link
                .addClass('macro-arearose-link')
                .attr('data-id', id)
                .attr('data-dir', dir)
                .attr('data-area', maparea.name)
                .prop('disabled', disabled?.[id])
                .css({
                    visibility: hidden?.[id] ? 'hidden' : 'visible',
                })
                .html(maparea.name)
                .appendTo($dir);
        }
    }

    $rose.on('click', function(ev) {
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

    const { mapname, id_target, abort } = {
        abort: false,   // default value
        ...argObj,
    }
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