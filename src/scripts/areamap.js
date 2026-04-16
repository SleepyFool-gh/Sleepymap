const options = {
    default: {
        wall_id                 : ".",
        diagonals               : false,
        position_story_variable : "@areamap/pos",
    }
}
setup['@areamap/options'] = options;


// areamap macro
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants
Macro.add(["newareamap", "new_areamap"], {

    // child tags
    tags    :    ["mapvars", "mapareas"],

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
        // uses default values if not assigned,
        diagonals   : argObj.diagonals   ?? options.default.diagonals,
    };
    this_macro.maps[mapname] = this_map;



//     █    █  ███  ████   ███  ████  █████  ███   ████
//     ██  ██ █   █ █   █ █   █ █   █ █     █   █ █
//     █ ██ █ █████ ████  █████ ████  ███   █████  ███
//     █    █ █   █ █     █   █ █   █ █     █   █     █
//     █    █ █   █ █     █   █ █   █ █████ █   █ ████
//      SECTION: mapareas

    // ERROR: mapareas not an object
    if (argObj.mapareas && (typeof argObj.mapareas !== 'object')) {
        throw new Error(`new_areamap — areamap "${mapname}" — mapareas not an object!`)
    }

    // create mapareas, areas being named regions on map
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

    // ERROR: mapvars not an object
    if (argObj.mapvars && (typeof argObj.mapvars !== 'object')) {
        throw new Error(`new_areamap — areamap "${mapname}" — mapvars not an object!`)
    }

    // create mapvars
    const mapvars = argObj.mapvars ?? {};
    window.mapvars = mapvars;
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

    const { diagonals } = this_map;

    // create empty exits object
    const exits = {};
    this_map.exits = exits;
    Object.keys(mapareas).forEach( function(id) {
        if (diagonals) {
            exits[id] = {
                N   : new Set(),
                E   : new Set(),
                W   : new Set(),
                S   : new Set(),
                NW  : new Set(),
                NE  : new Set(),
                SE  : new Set(),
                SW  : new Set(),
            };
        }
        else {
            exits[id] = {
                N   : new Set(),
                E   : new Set(),
                W   : new Set(),
                S   : new Set(),
            };
        }
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

function create_arearose(argObj) {

    const mapname = argObj.mapname;
    // ERROR: no mapname provided
    if (! mapname) {
        throw new Error(`create_arearose — no map name provided!`)
    }

    const this_map = Macro.get('new_areamap').maps[mapname];
    const { diagonals, mapareas, mapvars, exits } = this_map;

    const position  = State.getVar(mapvars.position);
    const disabled  = State.getVar(mapvars.disabled);
    const hidden    = State.getVar(mapvars.hidden);
    const prevented = State.getVar(mapvars.prevented);
    console.log(position);

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
    const dirs  = ['N', 'E', 'S', 'W', 'NE', 'NW', 'SE', 'SW']
    for (const dir of dirs) {
        // create dir container
        const $dir  = $(document.createElement('div'));
        $dir
            .addClass('macro-arearose-dir')
            .attr('data-dir', dir)
            .appendTo($rose);

        // skip adding links if diagonals not enabled
        if ((! diagonals) && ['NE', 'NW', 'SE', 'SW'].includes(dir)) {
            continue;
        }
        // add links
        for (const id of exits[position][dir]) {
            const maparea = mapareas[id];
            const $link = $(document.createElement('link'));
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
        const id_entering = $(ev.target).attr('data-id');
        navigate(mapname, id_entering);
    });

    return $rose
}

function navigate(mapname, id_entering) {
    // TODO: implement navigation logic
}

// // regionrose macro
// // generates a 4 or 8 wind compass rose for navigation through the map defined using the areamap macro
// Macro.add('regionrose', {
//     tags        :    ['center','north','northeast','east','southeast','south','southwest','west','northwest','onmove','onenter','onleave','onabort','onattempt','disable','hide','abort'],
//     allRoses    :    {},

//     // aux function to create links for available nav places, returned as a string to wiki
//     createPlaceLinks    :   function(thisMap,d,$dir,disableLinks) {

//         // by default links are not all disabled
//         disableLinks ??= false;

//         let thisRose = this.allRoses[thisMap.name];
//         let posCode = State.getVar(thisRose.position);
        

//         // grab alt names
//         const altNames =    typeof thisMap.altNames === 'object'    ?   thisMap.altNames :                  // is name object
//                             typeof thisMap.altNames === 'string'    ?   State.getVar(thisMap.altNames) :    // is name story variable, grab it
//                                                                         undefined;                          // not defined
//         if (typeof altNames !== 'undefined' && typeof altNames !== 'object') {
//             throw new Error('invalid regionmmap regionnames variable')
//         }


//         // grab hide variables
//         const hide =    typeof thisRose.hide === 'object'   ?   thisRose.hide :                             // is hide object
//                         typeof thisRose.hide === 'string'   ?   State.getVar(thisRose.hide) :               // is hide story variable, grab it
//                                                                 undefined;                                  // not defined
//         if (typeof hide !== 'undefined' && typeof hide !== 'object') {
//             throw new Error('invalid regionrose hide variable')
//         }


//         // grab hide variables
//         const disable = typeof thisRose.disable === 'object'    ?   thisRose.disable :                      // is disable object
//                         typeof thisRose.disable === 'string'    ?   State.getVar(thisRose.disable) :        // is disable story variable, grab it
//                                                                     undefined;                              // not defined
//         if (typeof disable !== 'undefined' && typeof disable !== 'object') {
//             throw new Error('invalid regionrose disable variable')
//         }
        

//         // if center, output is just name of current location
//         if (d === 'center') {
//             const posName = typeof altNames === 'undefined' ? posCode : altNames[posCode] ?? posCode;

//             // update values on parent, replace contents on output children
//             $dir
//                     .attr('data-posCode',posCode)
//                     .attr('data-posName',posName)
//                     .children('.macro-regionrose-output').html(posName);
//             return
//         }
//         // create link that update position story variable and region rose
//         else {
//             const $output = $dir.children('.macro-regionrose-output');
//             $output.html('');

//             for (let i = 0; i < thisMap.regions[posCode][d].length; i++) {
                
//                 const newCode = thisMap.regions[posCode][d][i];
//                 const newName = typeof altNames === 'undefined' ? newCode : altNames[newCode] ?? newCode;

//                 const thisHide =    typeof hide === 'undefined'             ?   false :                             // no hide defined
//                                     typeof hide[newCode] === 'undefined'    ?   false :                             // no hide for this position defined
//                                     typeof hide[newCode] === 'boolean'      ?   hide[newCode] :                     // this hide defined as boolean
//                                     typeof hide[newCode] === 'string'       ?   State.getVar(hide[newCode]) :       // this hide defined as story variable
//                                                                                 undefined;                          // error catcher
//                 if (typeof thisHide === 'undefined') {
//                     throw new Error('invalid regionrose hide variable')
//                 }

//                 const thisDisable = typeof disable === 'undefined'          ?   false :                             // no disable defined
//                                     typeof disable[newCode] === 'undefined' ?   false :                             // no disable for this position defined
//                                     typeof disable[newCode] === 'boolean'   ?   disable[newCode] :                  // this disable defined as boolean
//                                     typeof disable[newCode] === 'string'    ?   State.getVar(disable[newCode]) :    // this disable defined as story variable
//                                                                                 undefined;                          // error catcher
//                 if (typeof thisDisable === 'undefined') {
//                     throw new Error('invalid regionrose disable variable')
//                 }


//                 const $link = $(document.createElement('a'));

//                 // create link
//                 $link
//                         .wiki(newName)
//                         .addClass('macro-link macro-link-internal macro-regionrose-link')
//                         .attr('data-posCode',newCode)
//                         .attr('data-posName',newName)
//                         .attr('data-regionrose-dir',d)
//                         .ariaClick({
//                             namespace : '.macros'
//                         },() => Macro.get('regionrose').updateRose(thisMap,newCode))
//                         .ariaDisabled(thisDisable || disableLinks)
//                         .toggle(! thisHide)
//                         .appendTo($output);

//                 // update values on parent
//                 $dir
//                         .attr('data-posCode',newCode)
//                         .attr('data-posName',newName);

                            

//             }
//             return 
//         }

//     },

//     // aux function to update the nav rose, runs any scripts set to run by the rose
//     updateRose          :   function(thisMap,newCode,params) {

//         const thisRose = this.allRoses[thisMap.name];
//         const directions = thisMap.wind === 8 ? ['center','north','northeast','east','southeast','south','southwest','west','northwest'] : ['center','north','east','south','west'];
  
//         // by default, runs payloads, does not disable links, does not force update
//         const runPayloads   =   typeof params === 'undefined'               ?   true :
//                                 typeof params.runPayloads === 'undefined'   ?   true :
//                                                                                 params.runPayloads;
//         const disableLinks  =   typeof params === 'undefined'               ?   false :
//                                 typeof params.disableLinks === 'undefined'  ?   false :
//                                                                                 params.disableLinks;
//         const forceUpdate   =   typeof params === 'undefined'               ?   false :
//                                 typeof params.forceUpdate === 'undefined'   ?   false :
//                                                                                 params.forceUpdate;

//         // grab alt names
//         const altNames =    typeof thisMap.altNames === 'object'    ?   thisMap.altNames :                      // is name object
//                             typeof thisMap.altNames === 'string'    ?   State.getVar(thisMap.altNames) :        // is name story variable, grab it
//                                                                         undefined;                              // not defined
        

//         // grab old position code, update new position, write to appropriate story variables
//         // only write if different
//         const leaveCode = State.getVar(thisRose.position);
//         if (typeof thisRose.leaveCode !== 'undefined' && leaveCode !== newCode) {
//             State.setVar(thisRose.leaveCode,leaveCode);
//         }
//         // removed enterName & leaveName for now
//         // if (typeof thisRose.leaveName !== 'undefined') {
//         //     const leaveName = typeof altNames === 'undefined' ? leaveCode : altNames[leaveCode] ?? leaveCode;
//         //     State.setVar(thisRose.leaveName,leaveName);
//         // }
//         const enterCode = newCode;
//         if (typeof thisRose.enterCode !== 'undefined') {
//             State.setVar(thisRose.enterCode,enterCode);
//         }
//         // removed enterName & leaveName for now
//         // if (typeof thisRose.enterName !== 'undefined') {
//         //     const enterName = typeof altNames === 'undefined' ? enterCode : altNames[enterCode] ?? enterCode;
//         //     State.setVar(thisRose.enterName,enterName);
//         // }
        

//         // grab payloads
//         const {onattempt,onmove,onenter,onleave,onabort} = thisRose.payload;
        

//         // run any scripts defined to run before moving
//         if (typeof onattempt[0] !== 'undefined') {                                                          // onattempt has no arguments, always runs
//             $.wiki(onattempt[0].contents);
//         }


//         // grab abort variable
//         const abort =   typeof thisRose.abort === 'object'  ?   thisRose.abort :                            // is abort object
//                         typeof thisRose.abort === 'string'  ?   State.getVar(thisRose.abort) :              // is abort story variable, grab it
//                                                                 undefined;                                  // not defined
//         if (typeof abort !== 'undefined' && typeof abort !== 'object') {
//             throw new Error('invalid regionrose abort variable')
//         }

//         const thisAbort =   typeof abort === 'undefined'            ?   false :                             // no abort defined
//                             typeof abort[enterCode] === 'undefined' ?   false :                             // no abort for this position defined
//                             typeof abort[enterCode] === 'boolean'   ?   abort[enterCode] :                  // this abort defined as boolean
//                             typeof abort[enterCode] === 'string'    ?   State.getVar(abort[enterCode]) :    // this abort defined as story variable
//                                                                         undefined;                          // error catcher
//         if (typeof thisAbort === 'undefined') {
//             throw new Error('invalid regionrose abort variable')
//         }


//         if (thisAbort) {

//             // run any scripts for aborting
//             if (runPayloads) {
//                 for (let i = 0; i < onabort.length; i++) {
//                     if (    Array.isArray(onabort[i].args[0]) && onabort[i].args[0].includes(enterCode)     ||  // array input includes enterCode
//                             onabort[i].args.includes(enterCode)     ||                                          // string or list of strings includes enterCode
//                             typeof onabort[i].args[0] === 'undefined'   ) {                                     // empty argument -> always runs on abort     
//                         $.wiki(onabort[i].contents);
//                     }
//                 }
//             }

//         }
//         else {
            
//             // run any scripts for leaving
//             if (runPayloads) {
//                 for (let i = 0; i < onleave.length; i++) {
//                     if (    Array.isArray(onleave[i].args[0]) && onleave[i].args[0].includes(leaveCode)     ||  // array input includes leaveCode
//                             onleave[i].args.includes(leaveCode)     ||                                          // string or list of strings includes leaveCode
//                             typeof onleave[i].args[0] === 'undefined'   ) {                                     // empty argument -> always runs on leaving
//                         $.wiki(onleave[i].contents);
//                     }
//                 }
//             }

//             // update new position
//             State.setVar(thisRose.position,newCode);

//             // run any scripts for moving
//             if (runPayloads) {
//                 if (typeof onmove[0] !== 'undefined') {                                                         // onmove has no arguments, always runs
//                     $.wiki(onmove[0].contents); 
//                 }
//             }

//             if (thisRose.autoupdate || forceUpdate) {
//                 // delete old attribute values
//                 $('.macro-regionrose-dir')
//                                             .attr('data-posCode','')
//                                             .attr('data-posName','');
//                 // go through each direction & update new links
//                 for (let i = 0; i < directions.length; i++) {

//                     let d = directions[i];

//                     const $dir = $(`.macro-regionrose-dir[data-rosedir=${d}]`);
//                     this.createPlaceLinks(thisMap,d,$dir,disableLinks);
//                 }
//             }

//             // run any scripts for entering
//             if (runPayloads) {
//                 for (let i = 0; i < onenter.length; i++) {
//                     if (    Array.isArray(onenter[i].args[0]) && onenter[i].args[0].includes(enterCode)     ||  // array input includes enterCode
//                             onenter[i].args.includes(enterCode)     ||                                          // string or list of strings includes enterCode
//                             typeof onenter[i].args[0] === 'undefined'   ) {                                     // empty argument -> always runs on entering
//                         $.wiki(onenter[i].contents);
//                     }
//                 }
//             }

//         }

//     },

//     handler() {


        
//         // throw error if no arguments
//         if (this.args.length === 0) {
//             return this.error('no region map name specified')
//         }
//         const thisMap = Macro.get('areamap').allMaps[this.args[0]];

//         // throw error if map was not found
//         if (typeof thisMap === 'undefined') {
//             return this.error('region map was not found')
//         }
        

//         // create argument object
//         this.argObj = Macro.get('areamap').argsToObj(this.args,1);

//         // throw error if no position input
//         if (typeof this.argObj.position === 'undefined') {
//             return this.error('no position story variable was input')
//         }

//         // throw error if values of appropriate properties are not story variables
//         // removed enterName & leaveName for now

//         // for (const key of ['position','enterCode','enterName','leaveCode','leaveName']) {
//         //     if (typeof this.argObj[key] !== 'undefined' && this.argObj[key].toString().first() !== '$') {
//         //         return this.error(`property value, ${key}, input was not a story variable`)
//         //     }
//         // }
//         for (const key of ['position','enterCode','leaveCode']) {
//             if (typeof this.argObj[key] !== 'undefined' && this.argObj[key].toString().first() !== '$') {
//                 return this.error(`property value, ${key}, input was not a story variable`)
//             }
//         }


//         // map arguments onto thisRose, clear all previously assigned variables
//         // removed enterName & leaveName for now
//         // this.self.allRoses[thisMap.name] = {name: thisMap.name, position: undefined, enterCode: undefined, enterName: undefined, leaveCode: undefined, leaveName: undefined, abort: undefined, hide: undefined, disable: undefined};
//         this.self.allRoses[thisMap.name] = {name: thisMap.name, position: undefined, enterCode: undefined, leaveCode: undefined, autoupdate: undefined, abort: undefined, hide: undefined, disable: undefined};
//         const thisRose = this.self.allRoses[thisMap.name];
//         Object.assign(thisRose,this.argObj);

//         // autoupdate by default
//         thisRose.autoupdate ??= true;
        
//         const posCode = State.getVar(thisRose.position);

//         // if position not found on region map, return error
//         if (typeof thisMap.regions[posCode] === 'undefined') {
//             return this.error('position was not found in region map')
//         }


//         // grab hide disable and abort vars from tags, assign only if not previously assigned from ^
//         for (const t of ['hide','disable','abort']) {
//             const tag = this.payload.filter( e => e.name === t );
//             // only assign if not previously assigned
//             thisRose[t] ??=     typeof tag[0] === 'undefined'   ?   undefined :                                           // no child tag found
//                                 tag[0].args.length === 1        ?   tag[0].args[0] :                                      // only one argument
//                                                                     Macro.get('areamap').argsToObj(tag[0].args,0,t);    // feed into arg object parser

//             // throw error if empty object returned, means no arguments given
//             if (typeof thisRose[t] === 'object' && Object.keys(thisRose[t]).length === 0) {
//                 return this.error(`${t} tag input cannot be empty`)
//             }
//             // throw error if defined and not string or object
//             if (typeof thisRose[t] !== 'undefined' && typeof thisRose[t] !== 'string' && typeof thisRose[t] !== 'object') {
//             return this.error(`${t} tag invalid input: must be a story variable, a space separated string list, or an object`)
//             }
//             // throw error if string and not a story variable
//             if (typeof thisRose[t] === 'string' && thisRose[t].first() !== '$') {
//                 return this.error(`${t} tag invalid input: must be a story variable, a space separated string list, or an object`)
//             }

//         }


//         // move payloads onto macro definition
//         thisRose.payload = {};
//         for (const p of ['onmove','onenter','onleave','onabort','onattempt']) {
//             thisRose.payload[p] = this.payload.filter( e => e.name === p );
//         }


//         // generate rose element
//         const $rose = $(document.createElement('div'));

//         $rose
//                 .addClass('macro-regionrose')
//                 .attr('data-areamap',thisMap.name);


//         // fill out each direction with output elements
//         const directions = thisMap.wind === 8 ? ['center','north','northeast','east','southeast','south','southwest','west','northwest'] : ['center','north','east','south','west'];
//         for (let i = 0; i < directions.length; i++) {

//             const d = directions[i];
//             const $dir = $(document.createElement('div'));

//             $dir
//                     .addClass('macro-regionrose-dir')
//                     .attr('data-rosedir',d)

//             const dPayload = this.payload.filter( e => e.name === d )[0];
            
//             // check if payload exists
//             // wrap or append output element as needed, depending on if _contents exists inside payload
//             if (typeof dPayload !== 'undefined') {
//                 if (dPayload.contents.includes('_contents')) {
//                     const dWrapper = dPayload.contents.split('_contents');
//                     $dir.wiki(String(dWrapper[0]) + `<div class='macro-regionrose-output' data-rosedir=${d}></div>` + String(dWrapper [1]));
//                 }
//                 else {
//                     $dir.wiki(`<div class='macro-regionrose-output' data-rosedir=${d}></div>`);
//                     $dir.wiki(dPayload.contents);
//                 }
//             }
//             else {
//                 $dir.wiki(`<div class='macro-regionrose-output' data-rosedir=${d}></div>`);
//             }

//             // add links to output elements
//             this.self.createPlaceLinks(thisMap,d,$dir);

//             // add directions to rose
//             $dir.appendTo($rose);
//         }


//         // if rose payload has something, wiki it
//         if (this.payload[0].contents !== '') {
//             $rose.wiki(this.payload[0].contents);
//         }
        

//         // add rose to output
//         $rose.appendTo(this.output);

//     }
// });


// // aux macro to force rose update
// Macro.add('roseupdate', {
//     handler() {

//         // whether to run payloads, default false
//         const runPayloads   = this.args.includes(':forcecode');
//         this.args.delete(':forcecode');
//         const disableLinks  = this.args.includes(':disableall');
//         this.args.delete(':disableall');
//         const forceUpdate   = ! this.args.includes(':suppress');
//         this.args.delete(':suppress');

//         const params = {
//             runPayloads     : runPayloads,
//             disableLinks    : disableLinks,
//             forceUpdate     : forceUpdate,
//         };
        
//         // if no name provided, grab first found rose
//         const name = this.args[0] ??= $('.macro-regionrose').attr('data-areamap');

//         if (typeof name === 'undefined') {
//             return this.error("no rose found on page")
//         }


//         const thisMap = Macro.get('areamap').allMaps[name];
//         const thisRose = Macro.get('regionrose').allRoses[name];

//         // throw error if map or rose definition was not found
//         if (typeof thisMap === 'undefined') {
//             return this.error('map definition was not found')
//         }
//         if (typeof thisRose === 'undefined') {
//             return this.error('rose definition was not found')
//         }

//         const posCode = State.getVar(thisRose.position);
//         Macro.get('regionrose').updateRose(thisMap,posCode,params);
//     }
// });


// // aux macro to enable disable rose links
// Macro.add(['rosedisable','roseenable'], {
//     handler() {
//         if (this.args.length === 0) {
//             $('.macro-regionrose-output a').ariaDisabled(this.name === 'rosedisable');
//         }
//         else {
//             $(`.macro-regionrose-output a[data-posCode=${this.args[0]}]`).ariaDisabled(this.name === 'rosedisable');
//         }
//     }
// });

// // aux macro to show hide rose links
// Macro.add(['roseshow','rosehide'], {
//     handler() {
//         if (this.args.length === 0) {
//             $('.macro-regionrose-output a').toggle(this.name === 'roseshow');
//         }
//         else {
//             $(`.macro-regionrose-output a[data-posCode=${this.args[0]}]`).toggle(this.name === 'roseshow');
//         }
//     }
// });