(() => {

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
        autoupdate_rose         : true,
        autoupdate_mapview      : true,
        clickable_mapview       : true,
        show_names_on_mapview   : true,
    }
}
setup['@areamap/options'] = options;




// █    █ █████ █     █     █    █  ███  ████
// ██   █ █     █     █     ██  ██ █   █ █   █
// █ █  █ ███   █  █  █     █ ██ █ █████ ████
// █  █ █ █     █ █ █ █     █    █ █   █ █
// █   ██ █████  █   █      █    █ █   █ █
// SECTION: new_map function & macro wrapper
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants

// map container
const areamaps = {};

// macro wrapper for new_map
Macro.add(['newareamap', 'new_areamap'], {

    // child tags
    tags    :    ['mapvars', 'mapareas'],

    handler() {

        const name = this.name;

        // ERROR: macro being called outside StoryInit
        if (turns() !== 0) {
            throw new Error(`${name} — macro must be called during StoryInit!`);
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
        const argObj = new ArgObj(name, template_main, this.args);

        // create map array from payload
        argObj.maparray = this.payload[0].contents.trim().split(/\s+/g);

        // if <<mapareas>> exists
        // should be an object of values to write into the area data when areas are being generated
        const mapareas = this.payload.find( p => p.name === 'mapareas' )?.args[0]
        if (mapareas) {
            // ERROR: args not an object
            if (typeof mapareas !== 'object') {
                throw new Error(`${name} — <<mapareas>> args must be an object!`);
            }
            argObj.mapareas = mapareas;
        }

        // if <<mapvars>> exists
        const payload_mapvars = this.payload.find( p => p.name === 'mapvars' );
        if (payload_mapvars) {
            const args = payload_mapvars.args;
            // REMINDER: changing anything here also requires changing MAPVAR_DEFAULTS
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

// creates map object on the new_areamap macro
function new_map(argObj) {


//     ███ █    █ ███ █████     █    █  ███  ████
//      █  ██   █  █    █       ██  ██ █   █ █   █
//      █  █ █  █  █    █       █ ██ █ █████ ████
//      █  █  █ █  █    █       █    █ █   █ █
//     ███ █   ██ ███   █       █    █ █   █ █
//      SECTION: init the areamap
//      creates map object on the new_areamap macro

    const { mapname, columns, maparray } = argObj;
    const diagonals = argObj.diagonals ?? options.default.diagonals;    // default value
    const name = argObj.name ?? 'Areamap.new_map';

    // ERROR: no map name or columns or map array provided
    if (mapname === undefined) {
        throw new Error(`${name} — no map name provided!`);
    }
    // ERROR: map with name already exists
    else if (areamaps[mapname]) {
        throw new Error(`${name} — areamap with name "${mapname}" already exists!`);
    }
    // ERROR: columns not a number (or undefined)
    else if (typeof columns !== 'number') {
        throw new Error(`${name} — areamap "${mapname}" — columns must be a number!`);
    }
    // ERROR: maparray not an array (or undefined)
    else if (! Array.isArray(maparray)) {
        throw new Error(`${name} — areamap "${mapname}" — maparray must be an array!`);
    }
    // ERROR: maparray not rectangular
    else if (maparray.length % columns !== 0) {
        throw new Error(`${name} — areamap "${mapname}" — maparray must be rectangular (whole number multiple of columns)!`);
    }

    // create map object
    const this_map = {
        mapname,
        columns,
        maparray,
        diagonals,
        mapareas    : {},   // populated here, later
        mapvars     : {},   // populated here, later
        exits       : {},   // populated here, later
        scripts     : [],   // populated in set_scripts, if called
    };
    areamaps[mapname] = this_map;


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
        throw new Error(`${name} — areamap "${mapname}" — mapareas not an object!`);
    }

    // create mapareas
    const mapareas = this_map.mapareas;
    // take unique values from map array, create areas for each
    [...new Set(maparray)].forEach( function(id) {
        mapareas[id] = {
            id      : id,                                       // area identifier
            name    : argObj.mapareas?.[id]?.name ?? id,       // name, use maparea name if found
            type    : argObj.mapareas?.[id]?.type ?? 'floor',  // area type, use maparea type if found
        };
    });
    // overwrite with default wall
    {
        const id = options.default.wall_id;
        mapareas[id] = {
            id      : id,
            name    : argObj.mapareas?.[id]?.name ?? id,
            type    : argObj.mapareas?.[id]?.type ?? 'wall',
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
        throw new Error(`${name} — areamap "${mapname}" — mapvars not an object!`);
    }

    // create mapvars
    const mapvars = this_map.mapvars;

    // REMINDER: changing anything here also requires changing <<mapvars>> template
    const MAPVAR_DEFAULTS = {
        position: {
            sv_name : argObj?.mapvars?.position ?? options.default.position_story_variable,
            val     : '',
        },
        frozen: {
            sv_name : argObj?.mapvars?.frozen,
            val     : false,
        },
        disabled: {
            sv_name : argObj?.mapvars?.disabled,
            val     : Object.keys(mapareas).reduce((obj, area) => { obj[area] = false; return obj; }, {}),
        },
        hidden: {
            sv_name : argObj?.mapvars?.hidden,
            val     : Object.keys(mapareas).reduce((obj, area) => { obj[area] = false; return obj; }, {}),
        },
        blocked: {
            sv_name : argObj?.mapvars?.blocked,
            val     : Object.keys(mapareas).reduce((obj, area) => { obj[area] = false; return obj; }, {}),
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
            throw new Error(`${name} — areamap "${mapname}" — mapvar only accepts strings!`);
        }
        // ERROR: mapvar value is not a story variable
        else if (sv_name.first() !== '$') {
            throw new Error(`${name} — areamap "${mapname}" — mapvar must be a story variable starting with "$"!`);
        }
        // WARNING: clobbering something
        if (State.getVar(sv_name) !== undefined) {
            console.warn(`${name} — areamap "${mapname}" — something was clobbered while setting mapvar "${key}" at "${sv_name}"!`);
        }

        // set default value
        mapvars[key] = sv_name;
        State.setVar(sv_name, MAPVAR_DEFAULTS[key].val);
    }


//     █████ █   █ ███ █████  ████
//     █      █ █   █    █   █
//     ███     █    █    █    ███
//     █      █ █   █    █       █
//     █████ █   █ ███   █   ████
//      SECTION: exits
//      backbone that checks exits for each area

    // create empty exits object
    const exits = this_map.exits;
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




// ████   ████   ████ █████
// █   █ █    █ █     █
// ████  █    █  ███  ███
// █   █ █    █     █ █
// █   █  ████  ████  █████
// SECTION: rose for navigation

// macro wrapper, calls the create_rose function (which returns a $rose object)
// then attaches it to the macro output
Macro.add(['place_areamap_rose'], {
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
    const name = argObj.name ?? 'Areamap.create_rose';

    // ERROR: no mapname provided
    if (mapname === undefined) {
        throw new Error(`${name} — no map name provided!`);
    }

    const this_map = areamaps[mapname];

    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — couldn't find map with name "${mapname}"!`);
    }

    const { mapareas, mapvars, exits } = this_map;

    const position  = State.getVar(mapvars.position);
    const frozen    = mapvars.frozen !== undefined      
                        ? State.getVar(mapvars.frozen) 
                        : false;
    const disabled  = mapvars.disabled !== undefined    
                        ? State.getVar(mapvars.disabled) 
                        : null;
    const hidden    = mapvars.hidden   !== undefined    
                        ? State.getVar(mapvars.hidden)   
                        : null;

    // ERROR: invalid position, either not set or non-existing or a wall
    if (
        (position === null) ||
        (mapareas[position] === undefined) ||
        (mapareas[position].type === 'wall')
    ) {
        throw new Error(`${name} — map "${mapname}" — position currently invalid!`);
    }

    // create rose
    const $rose =   $(document.createElement('div'));
    $rose
        .addClass('macro-areamap-rose')
        .attr('data-mapname', mapname)
        .attr('data-position', position);

    // insert background
    if (background) {
        $(document.createElement('div'))
            .addClass('macro-areamap-rosebg')
            .html(background)
            .appendTo($rose);
    }

    // create center
    $(document.createElement('div'))
        .addClass('macro-areamap-dir')
        .attr('data-id', position)
        .attr('data-dir', 'C')
        .html(mapareas[position].name)
        .appendTo($rose);

    // create each dir
    for (const dir of ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE']) {
        // create dir container
        const $dir  = $(document.createElement('div'));
        $dir
            .addClass('macro-areamap-dir')
            .attr('data-dir', dir)
            .appendTo($rose);

        // add links to rose
        // diagonals will be empty if not enabled
        for (const id of exits[position][dir]) {
            const maparea = mapareas[id];
            const $link = $(document.createElement('a'));
            $link
                .addClass('macro-areamap-link')
                .attr('data-id', id)
                .attr('data-dir', dir)
                .attr('data-maparea', maparea.name)
                .prop('disabled', disabled?.[id] || frozen)
                .css({
                    visibility: hidden?.[id] ? 'hidden' : 'visible',
                })
                .html(maparea.name)
                .appendTo($dir);
        }
    }

    // click listener that triggers mapmove & rose refresh
    $rose.on('click', '.macro-areamap-link', function(ev) {
        const id_target = $(ev.target).attr('data-id');
        begin_mapmove({
            mapname,
            id_target,
        });
    });
    // if autoupdate enabled, updates on any mapmove
    if (autoupdate) {
        $(document).one('areamap:mapmove_resolved', function(ev, data) {
            $rose.replaceWith(create_rose(argObj));
        });
    }

    return $rose;
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

// macro wrapper for set_scripts
Macro.add(['set_areascripts','setareascripts'], {

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

        set_scripts({
            name,
            mapname,
            scripts,
        });
    }
});

// assigns scripts to map object on new_areamap macro object
function set_scripts(argObj) {
    const { mapname, scripts } = argObj;
    const name = argObj.name ?? 'Areamap.set_scripts';
    
    // ERROR: no map name provided
    if ((mapname === undefined) || (scripts === undefined)) {
        throw new Error(`${name} — missing required arguments!`);
    }
    
    const this_map = areamaps[mapname];
    
    // ERROR: no map found
    if (this_map === undefined) {
        throw new Error(`${name} — couldn't find map with name "${mapname}"!`);
    }

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
            if (script.areas[arg] !== 'any') {
                script.areas[arg].forEach( area => {
                    if (typeof area !== 'string') {
                        throw new Error(`${name} — ${script.type} — map ${mapname}, "${arg}" must be a string, array of strings, or keyword "any"`);
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
Macro.add(['areamapmove', 'areamap_move'], {
    handler() {
        const name = this.name;
        const template = {
            mapname: {
                required: true,
                type: 'string',
            },
            id_target: {
                type: 'string',
                aliases: ['target','id', 'area'],
            },
            force_abort: {
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

    const { mapname, id_target } = argObj;
    const name = argObj.name ?? 'Areamap.begin_mapmove';
    const force_abort = argObj.force_abort ?? false;    // default value

    // ERROR: missing args
    if ((mapname === undefined) || (id_target === undefined)) {
        throw new Error(`${name} — missing required arguments!`);
    }
    
    const this_map = areamaps[mapname];

    // ERROR: map not found
    if (this_map === undefined) {
        throw new Error(`${name} — areamap "${mapname}" not found!`);
    }

    const id_origin = State.getVar(this_map.mapvars.position);

    // fire began event
    $('#passages').trigger('areamap:mapmove_began', { mapname, id_origin, id_target, force_abort });

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
$(document).on('areamap:mapmove_began', (ev, argObj) => {
    resolve_mapmove(argObj);
});

// resolves map movement procedure
function resolve_mapmove(argObj) {
    const { mapname, id_target, force_abort } = argObj;
    const name = argObj.name ?? 'Areamap.resolve_mapmove';
    const this_map = areamaps[mapname];
    const id_origin = State.getVar(this_map.mapvars.position);
    const succeeded   = force_abort 
                        ? false 
                        : this_map.mapvars?.blocked !== undefined
                            ? ! State.getVar(this_map.mapvars.blocked)[id_target]
                            : true;

    if (succeeded) {
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
        succeeded,
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
    const name = argObj.name ?? 'Areamap.create_mapview';
    const show_names    = argObj.show_names ?? options.default.show_names_on_mapview;   // default value
    const autoupdate    = argObj.autoupdate ?? options.default.autoupdate_mapview;      // default value
    const clickable     = argObj.clickable  ?? options.default.clickable_mapview;       // default value

    // ERROR: missing args
    if (mapname === undefined) {
        throw new Error(`${name} — missing required args mapname!`);
    }
    
    const this_map = areamaps[mapname];
    const position = State.getVar(this_map.mapvars.position);
    
    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — areamap "${mapname}" not found!`);
    }
    
    // create map object
    const $mapview = $(document.createElement('div'));
    $mapview
        .addClass('macro-areamap-mapview')
        .attr('data-mapname', mapname)
        .attr('data-position', position)
        .css({
            '--columns': this_map.columns,
        });
    

    // append bg
    if (background) {
        $(document.createElement('div'))
            .addClass('macro-areamap-mapviewbg')
            .html(background)
            .appendTo($mapview);
    }

    // get exits as an array
    const exit_arr = Object.values(this_map.exits[position]);
    // create & append tiles
    for (const id of this_map.maparray) {
        // if clickable & valid travel destination --> clickable
        const link  = ! clickable
                        ? false
                        : this_map.mapareas[id].type === 'wall'
                            ? false
                            : exit_arr.some( dir => dir.has(id));
        
        const $tile = $(document.createElement(link ? 'a' : 'div'));
        $tile
            .addClass('macro-areamap-tile')
            .addClass(link ? 'macro-areamap-link' : '')
            .addClass(id === position ? 'macro-areamap-position' : '')
            .attr('data-id', id)
            .html(show_names ? this_map.mapareas[id].name : '');
        $mapview.append($tile);
    }

    // if clickable add link functionality
    if (clickable) {
        $mapview.on('click', '.macro-areamap-link', function(ev) {
            const id_target = $(ev.target).attr('data-id');
            begin_mapmove({
                mapname,
                id_target,
            });
        });
    }
    // if autoupdate enabled, updates on any mapmove
    if (autoupdate) {
        $(document).one('areamap:mapmove_resolved', function(ev, data) {
            $mapview.replaceWith(create_mapview(argObj));
        });
    }

    return $mapview;
}



//  ███  █   █ █   █
// █   █ █   █  █ █
// █████ █   █   █
// █   █ █   █  █ █
// █   █  ███  █   █
// SECTION: auxiliary functions for JS things

function get_areas(argObj) {
    const { mapname } = argObj;
    const name = 'Areamap.get_areas';
    
    // ERROR: missing args
    if (mapname === undefined) {
        throw new Error(`${name} — missing required arguments!`);
    }
    
    const this_map = areamaps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — areamap "${mapname}" not found!`);
    }
    
    return structuredClone(this_map.mapareas);
}

// fetch exits for a given map & area
function get_exits(argObj) {
    const { mapname, id } = argObj;
    const name = 'Areamap.get_exits';
    
    // ERROR: missing args
    if ((mapname === undefined) || (id === undefined)) {
        throw new Error(`${name} — missing required arguments!`);
    }
    
    const this_map = areamaps[mapname];

    // ERROR: non-extant map
    if (this_map === undefined) {
        throw new Error(`${name} — areamap "${mapname}" not found!`);
    }
    // ERROR: non-extant area
    else if (this_map.mapareas[id] === undefined) {
        throw new Error(`${name} — areamap "${mapname}" — area "${id}" not found!`);
    }
    // ERROR: walls don't have exits
    else if (this_map.mapareas[id].type === 'wall') {
        throw new Error(`${name} — areamap "${mapname}" — area "${id}" is a wall, walls have no exits!`);
    }
    
    return structuredClone(this_map.exits[id]);
}


// █████ █   █ ████   ████   ████ █████
// █      █ █  █   █ █    █ █     █
// ███     █   ████  █    █  ███  ███
// █      █ █  █     █    █     █ █
// █████ █   █ █      ████  ████  █████
// SECTION: expose functions

window.Areamap = {
    new_map,
    create_rose,
    begin_mapmove,
    set_scripts,
    get_exits,
    get_areas,
};

})();
