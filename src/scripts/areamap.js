// regionmap macro
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants
Macro.add("newmap", {

    config: {
        safemode    :   true,

        diagonals   :   false,
        walls       :   ".",

        disable     :   false,
        abort       :   false,
        hide        :   false,
    },


    tags    :    ["mapvars","maptiles"],
    maps    :    {},

    handler() {

//     █    █ █████ █     █ █    █  ███  ████
//     ██   █ █     █     █ ██  ██ █   █ █   █
//     █ █  █ ███   █  █  █ █ ██ █ █████ ████
//     █  █ █ █     █ █ █ █ █    █ █   █ █
//     █   ██ █████  █   █  █    █ █   █ █
//      SECTION: newmap

        // parse args to argsObj
        const template_newmap = {
            mapname: {
                type: 'string',
                required: true,
                omittable: true,
            },
            columns: {
                type: 'number',
                required: true,
                omittable: true,
            },
            diagonals: {
                type: 'boolean',
            },
        };
        const argsObj_newmap = args_to_argsObj.call(this,this.args,template_newmap);
        // get mapname
        const {mapname} = argsObj_newmap;

        // ERROR: map already exists => exit macro
        if (this.self.maps[mapname]) {
            return this.error(`map "${mapname}" already exists!`)
        }

        // create map object
        this.self.maps[mapname] = {
            // default values
            diagonals: this.self.config.diagonals, 
            // write from argsObj
            ...argsObj_newmap,
            // create map array
            arr: this.payload[0].contents.trim().split(/\s+/g),
        };

        // shortcut
        const this_map = this.self.maps[mapname];
        


//     █    █  ███  ████  █████ ███ █     █████  ████
//     ██  ██ █   █ █   █   █    █  █     █     █
//     █ ██ █ █████ ████    █    █  █     ███    ███
//     █    █ █   █ █       █    █  █     █         █
//     █    █ █   █ █       █   ███ █████ █████ ████
//      SECTION: maptiles

        // create default tiles
        this_map.tiles = {};
        this_map.arr.forEach( function(tile) {
            this_map.tiles[tile] ??= {
                id      : tile,
                name    : tile,
                type    : 'floor',
            };
        });
        this_map.tiles[this.self.config.walls] = {
            id      : this.self.config.walls,
            name    : this.self.config.walls,
            type    : 'wall',
        };

        // if <<maptiles>> exists
        if (this.payload.filter( p => p.name === 'maptiles' ).length) {
            // parse args
            const template_maptiles = {
                tiles: {
                    type: ['object','string'],
                    required: true,
                    omittable: true,
                },
            };
            console.log(args_maptiles);
            const args_maptiles     = this.payload.filter( p => p.name === 'maptiles' )[0].args;
            const argsObj_maptiles  = args_to_argsObj.call(this,args_maptiles,template_maptiles);
            console.log(argsObj_maptiles);
            // overwrite default values
            for (const a in argsObj_maptiles.tiles) {
                Object.assign(this_map.tiles[a],argsObj_maptiles.tiles[a])
            }
        }


//     █    █  ███  ████  █   █  ███  ████   ████
//     ██  ██ █   █ █   █ █   █ █   █ █   █ █
//     █ ██ █ █████ ████  █   █ █████ ████   ███
//     █    █ █   █ █      █ █  █   █ █   █     █
//     █    █ █   █ █       █   █   █ █   █ ████
//      SECTION: mapvars

        // parse arguments
        const argsTemplate_mapvars = {
            position: {
                type: 'story variable',
                required: true,
                key_omittable: true,
            },
            entering: {
                type: 'story variable',
            },
            leaving: {
                type: 'story variable',
            },
            disable: {
                type: 'story variable',
            },
            hide: {
                type: 'story variable',
            },
            abort: {
                type: 'story variable',
            },
        };
        const args_mapvars      = this.payload.filter( p => p.name === 'mapvars')[0].args;
        const argsObj_mapvars   = args_to_argsObj.call(this,args_mapvars,argsTemplate_mapvars);

        // store variables;
        this_map.vars = argsObj_mapvars;

        for (const v of ["disable","hide","abort"]) {
            if (this_map.vars[v]) {
                let $v = State.getVar(this_map.vars[v]);
                if (getType($v) !== 'object') {
                    $v = {};
                }
                for (const t of this_map.tiles) {
                    $v[t] ??= this.self.config[v];
                }
                State.setVar(this_map.vars[v],$v);
            }
        }

        /* set default values */
        // for (const v of ['disable','hide','abort']) {
        //     const defaultObj = {};
        //     if (argsObj_mapvars[v]) {
        //         tiles.forEach( (a) => defaultObj[a] = this.self.config[v] );
        //     }
        //     State.setVar(argsObj_mapvars[v],defaultObj);
        // }


    },
});


Macro.add("newnav", {

    config: {
        mergetiles  :   true,
    },

    tags    :   ["onattempt","onabort","onleave","onenter"],
    navs   :   {},

    handler() {

        const argsTemplate = {
            mapname: {
                type: 'string',
                required: true,
                key_omittable: true,
            },
            mergetiles: {
                type: 'boolean',
                key_omittable: true,
            }
        };
        const argsObj = args_to_argsObj.call(this,this.args,argsTemplate);

        //
        
        const {mapname} = argsObj;

        this.self.navs[mapname] = {mergetiles: this.self.config.mergetiles, ...argsObj};
        const this_nav = this.self.navs[mapname];
        this_nav.payload = clone(this.payload);
    },

    navObj_merged(navname) {

        

        
        // create region object
        this_map.tilesObj = {};
        tiles.forEach( function(tile) {
            this_map.tilesObj[tile] = {};
            Object.assign(this_map.tilesObj[tile]),{
                N: [],
                E: [],
                W: [],
                S: [],
            };
            if (diagonals ?? this.self.config.diagonals) {
                Object.assign(this_map.tilesObj[tile]),{
                    NW: [],
                    NE: [],
                    SE: [],
                    SW: [],
                };
            }
        });


        // populate regions object
        for (let i = 0; i < this_map.arr.length; i++) {

            const this_tile = this_map.arr[i];

            // if this node is a wall, skip
            if (this_tile === (walls ?? this.self.config.walls)) {
                continue
            }

            // if not first row, check north
            if (i >= columns) {
                const N_tile = this_map.arr[i-columns];
                if (
                    (this_tile !== N_tile)  &&
                    (N_tile !== (walls ?? this.self.config.walls))
                ) {
                    this_map.tilesObj[this_tile].N.pushUnique(N_tile);
                }
            }
            // if not last column, check east
            if ((i+1) % columns) {
                const E_tile = this_map.arr[i+1];
                if (
                    (this_tile !== E_tile)  &&
                    (E_tile !== (walls ?? this.self.config.walls))
                ) {
                    this_map.tilesObj[this_tile].E.pushUnique(E_tile);
                }
            }
            // if not last row, check south
            if (i < (this_map.arr.length - columns)) {
                const S_tile = this_map.arr[i+columns];
                if (
                    (this_tile !== S_tile)  &&
                    (S_tile !== (walls ?? this.self.config.walls))
                ) {
                    this_map.tilesObj[this_tile].S.pushUnique(S_tile);
                }
            }
            //if not first column, check west
            if (i % columns) {
                const W_tile = this_map.arr[i-1];
                if (
                    (this_tile !== W_tile)  &&
                    (W_tile !== (walls ?? this.self.config.walls))
                ) {
                    this_map.tilesObj[this_tile].W.pushUnique(W_tile);
                }
            }

            // extra handling for diagonals
            if (diagonals ?? this.self.config.diagonals) {

                
                // if not first row and not first column, check northwest
                if (
                    (i >= columns) && 
                    (i % columns)
                ) {
                    const NW_tile = this_map.arr[i-columns-1];
                    if (
                        (this_tile !== NW_tile) &&
                        (NW_tile !== (walls ?? this.self.config.walls))
                    ) {
                        this_map.arr[this_tile].NW.pushUnique(NW_tile);
                    }
                }

                // if not first row and not last column, check northeast
                if (
                    (i >= columns) && 
                    ((i+1) % columns)
                ) {
                    const NE_tile = this_map.arr[i-columns+1];
                    if (
                        (this_tile !== NE_tile) &&
                        (NE_tile !== (walls ?? this.self.config.walls))
                    ) {
                        this_map.tilesObj[this_tile].NE.pushUnique(NE_tile);
                    }
                }
                // if not last row and not last column, check southeast
                if (
                    (i < (this_map.arr.length - columns)) && 
                    ((i+1) % columns)
                ) {
                    const SE_tile = this_map.arr[i+columns+1];
                    if (
                        (this_tile !== SE_tile) &&
                        (SE_tile !== (walls ?? this.self.config.walls))
                    ) {
                        this_map.tilesObj[this_tile].SE.pushUnique(SE_tile);
                    }
                }
                // if not last row and not first column, check southwest
                if (
                    (i < (this_map.arr.length - columns)) && 
                    (i % columns)
                ) {
                    const SW_tile = this_map.arr[i+columns-1];
                    if (
                        (this_tile !== SW_tile) &&
                        (SW_tile !== (walls ?? this.self.config.walls))
                    ) {
                        this_map.tilesObj[this_tile].SE.pushUnique(SE_tile);
                    }
                }
            }
        }
    }
});

Macro.add("showrose", {
    config: {
        autoupdate  :   true,
    },
    handler() {
        const argsTemplate = {
            rosename: {
                type: 'string',
                required: true,
                key_omittable: true,
            },
            autoupdate: {
                type: 'boolean',
            },
        }
        const argsObj = args_to_argsObj.call(this,this.args,argsTemplate);
        const {rosename, autoupdate} = argsObj;

        const this_rose = Macro.get('newrose').roses[rosename];
        const this_map  = Macro.get('newmap').maps[this_rose.mapname];
        
        const abort     = State.getVar(this_map.vars.abort);

        const $container = $(document.createElement('div'));
        $container
                    .addClass('macro-showrose')
                    .on('click', function(ev) {
                        const dir = $(ev.target).attr('data-dir');
                        const tile = $(ev.target).attr('data-tile');
                        if (tile && dir !== 'C') {
                            // if (abort[tile] ?? Macro.get('newmap').config.abort) {
                            State.setVar(this_map.vars.position,tile);
                            if (autoupdate ?? Macro.get('showrose').config.autoupdate) {
                                $container.html('');
                                $container.append(Macro.get('showrose').createRose(rosename));
                            }
                        }
                    })
                    .append(Macro.get('showrose').createRose(rosename))
                    .appendTo(this.output);
    },
    createRose(rosename) {
        const this_rose = Macro.get('newrose').roses[rosename];
        const this_map  = Macro.get('newmap').maps[this_rose.mapname];
        
        const position  = State.getVar(this_map.vars.position);
        const hide      = State.getVar(this_map.vars.hide);
        const disable   = State.getVar(this_map.vars.disable);

        const $rose =   $(document.createElement('div'));
        $rose
                .addClass('macro-showrose-rose')
                .attr('data-map',this_rose.mapname)
                .attr('data-rose',this_rose.rosename);

        const $center = $(document.createElement('div'));
        const name_center   =   this_map.tilenames  ?   this_map.tilenames[position]
                            :   position;
        $center
                .addClass('macro-showrose-dir')
                .attr('data-dir','C')
                .html(name_center)
                .appendTo($rose)
        for (const dir of ['N','E','S','W']) {
            const $dir  =   $(document.createElement('div'));
            $dir
                    .addClass('macro-showrose-dir')
                    .attr('data-dir',dir);
            for (const tile of this_map.tilesObj[position][dir]) {
                const name_tile =   this_map.tilenames  ?   this_map.tilenames[tile]
                                :   tile;

                const $button = $(document.createElement('button'));
                $button
                        .addClass('macro-showrose-link')
                        .prop('disabled',disable[tile] ?? Macro.get("newmap").config.disable)
                        .attr('data-dir',dir)
                        .attr('data-tile',tile)
                        .css({
                            visibility: (hide[tile] ?? Macro.get("newmap").config.hide) ? 'visible' : 'hidden',
                        })
                        .html(name_tile)
                        .appendTo($dir);
            }
            $dir.appendTo($rose);
        }
        return $rose
    },
});

// regionrose macro
// generates a 4 or 8 wind compass rose for navigation through the map defined using the regionmap macro
Macro.add('regionrose', {
    tags        :    ['center','north','northeast','east','southeast','south','southwest','west','northwest','onmove','onenter','onleave','onabort','onattempt','disable','hide','abort'],
    allRoses    :    {},

    // aux function to create links for available nav places, returned as a string to wiki
    createPlaceLinks    :   function(thisMap,d,$dir,disableLinks) {

        // by default links are not all disabled
        disableLinks ??= false;

        let thisRose = this.allRoses[thisMap.name];
        let posCode = State.getVar(thisRose.position);
        

        // grab alt names
        const altNames =    typeof thisMap.altNames === 'object'    ?   thisMap.altNames :                  // is name object
                            typeof thisMap.altNames === 'string'    ?   State.getVar(thisMap.altNames) :    // is name story variable, grab it
                                                                        undefined;                          // not defined
        if (typeof altNames !== 'undefined' && typeof altNames !== 'object') {
            throw new Error('invalid regionmmap regionnames variable')
        }


        // grab hide variables
        const hide =    typeof thisRose.hide === 'object'   ?   thisRose.hide :                             // is hide object
                        typeof thisRose.hide === 'string'   ?   State.getVar(thisRose.hide) :               // is hide story variable, grab it
                                                                undefined;                                  // not defined
        if (typeof hide !== 'undefined' && typeof hide !== 'object') {
            throw new Error('invalid regionrose hide variable')
        }


        // grab hide variables
        const disable = typeof thisRose.disable === 'object'    ?   thisRose.disable :                      // is disable object
                        typeof thisRose.disable === 'string'    ?   State.getVar(thisRose.disable) :        // is disable story variable, grab it
                                                                    undefined;                              // not defined
        if (typeof disable !== 'undefined' && typeof disable !== 'object') {
            throw new Error('invalid regionrose disable variable')
        }
        

        // if center, output is just name of current location
        if (d === 'center') {
            const posName = typeof altNames === 'undefined' ? posCode : altNames[posCode] ?? posCode;

            // update values on parent, replace contents on output children
            $dir
                    .attr('data-posCode',posCode)
                    .attr('data-posName',posName)
                    .children('.macro-regionrose-output').html(posName);
            return
        }
        // create link that update position story variable and region rose
        else {
            const $output = $dir.children('.macro-regionrose-output');
            $output.html('');

            for (let i = 0; i < thisMap.regions[posCode][d].length; i++) {
                
                const newCode = thisMap.regions[posCode][d][i];
                const newName = typeof altNames === 'undefined' ? newCode : altNames[newCode] ?? newCode;

                const thisHide =    typeof hide === 'undefined'             ?   false :                             // no hide defined
                                    typeof hide[newCode] === 'undefined'    ?   false :                             // no hide for this position defined
                                    typeof hide[newCode] === 'boolean'      ?   hide[newCode] :                     // this hide defined as boolean
                                    typeof hide[newCode] === 'string'       ?   State.getVar(hide[newCode]) :       // this hide defined as story variable
                                                                                undefined;                          // error catcher
                if (typeof thisHide === 'undefined') {
                    throw new Error('invalid regionrose hide variable')
                }

                const thisDisable = typeof disable === 'undefined'          ?   false :                             // no disable defined
                                    typeof disable[newCode] === 'undefined' ?   false :                             // no disable for this position defined
                                    typeof disable[newCode] === 'boolean'   ?   disable[newCode] :                  // this disable defined as boolean
                                    typeof disable[newCode] === 'string'    ?   State.getVar(disable[newCode]) :    // this disable defined as story variable
                                                                                undefined;                          // error catcher
                if (typeof thisDisable === 'undefined') {
                    throw new Error('invalid regionrose disable variable')
                }


                const $link = $(document.createElement('a'));

                // create link
                $link
                        .wiki(newName)
                        .addClass('macro-link macro-link-internal macro-regionrose-link')
                        .attr('data-posCode',newCode)
                        .attr('data-posName',newName)
                        .attr('data-regionrose-dir',d)
                        .ariaClick({
                            namespace : '.macros'
                        },() => Macro.get('regionrose').updateRose(thisMap,newCode))
                        .ariaDisabled(thisDisable || disableLinks)
                        .toggle(! thisHide)
                        .appendTo($output);

                // update values on parent
                $dir
                        .attr('data-posCode',newCode)
                        .attr('data-posName',newName);

                            

            }
            return 
        }

    },

    // aux function to update the nav rose, runs any scripts set to run by the rose
    updateRose          :   function(thisMap,newCode,params) {

        const thisRose = this.allRoses[thisMap.name];
        const directions = thisMap.wind === 8 ? ['center','north','northeast','east','southeast','south','southwest','west','northwest'] : ['center','north','east','south','west'];
  
        // by default, runs payloads, does not disable links, does not force update
        const runPayloads   =   typeof params === 'undefined'               ?   true :
                                typeof params.runPayloads === 'undefined'   ?   true :
                                                                                params.runPayloads;
        const disableLinks  =   typeof params === 'undefined'               ?   false :
                                typeof params.disableLinks === 'undefined'  ?   false :
                                                                                params.disableLinks;
        const forceUpdate   =   typeof params === 'undefined'               ?   false :
                                typeof params.forceUpdate === 'undefined'   ?   false :
                                                                                params.forceUpdate;

        // grab alt names
        const altNames =    typeof thisMap.altNames === 'object'    ?   thisMap.altNames :                      // is name object
                            typeof thisMap.altNames === 'string'    ?   State.getVar(thisMap.altNames) :        // is name story variable, grab it
                                                                        undefined;                              // not defined
        

        // grab old position code, update new position, write to appropriate story variables
        // only write if different
        const leaveCode = State.getVar(thisRose.position);
        if (typeof thisRose.leaveCode !== 'undefined' && leaveCode !== newCode) {
            State.setVar(thisRose.leaveCode,leaveCode);
        }
        // removed enterName & leaveName for now
        // if (typeof thisRose.leaveName !== 'undefined') {
        //     const leaveName = typeof altNames === 'undefined' ? leaveCode : altNames[leaveCode] ?? leaveCode;
        //     State.setVar(thisRose.leaveName,leaveName);
        // }
        const enterCode = newCode;
        if (typeof thisRose.enterCode !== 'undefined') {
            State.setVar(thisRose.enterCode,enterCode);
        }
        // removed enterName & leaveName for now
        // if (typeof thisRose.enterName !== 'undefined') {
        //     const enterName = typeof altNames === 'undefined' ? enterCode : altNames[enterCode] ?? enterCode;
        //     State.setVar(thisRose.enterName,enterName);
        // }
        

        // grab payloads
        const {onattempt,onmove,onenter,onleave,onabort} = thisRose.payload;
        

        // run any scripts defined to run before moving
        if (typeof onattempt[0] !== 'undefined') {                                                          // onattempt has no arguments, always runs
            $.wiki(onattempt[0].contents);
        }


        // grab abort variable
        const abort =   typeof thisRose.abort === 'object'  ?   thisRose.abort :                            // is abort object
                        typeof thisRose.abort === 'string'  ?   State.getVar(thisRose.abort) :              // is abort story variable, grab it
                                                                undefined;                                  // not defined
        if (typeof abort !== 'undefined' && typeof abort !== 'object') {
            throw new Error('invalid regionrose abort variable')
        }

        const thisAbort =   typeof abort === 'undefined'            ?   false :                             // no abort defined
                            typeof abort[enterCode] === 'undefined' ?   false :                             // no abort for this position defined
                            typeof abort[enterCode] === 'boolean'   ?   abort[enterCode] :                  // this abort defined as boolean
                            typeof abort[enterCode] === 'string'    ?   State.getVar(abort[enterCode]) :    // this abort defined as story variable
                                                                        undefined;                          // error catcher
        if (typeof thisAbort === 'undefined') {
            throw new Error('invalid regionrose abort variable')
        }


        if (thisAbort) {

            // run any scripts for aborting
            if (runPayloads) {
                for (let i = 0; i < onabort.length; i++) {
                    if (    Array.isArray(onabort[i].args[0]) && onabort[i].args[0].includes(enterCode)     ||  // array input includes enterCode
                            onabort[i].args.includes(enterCode)     ||                                          // string or list of strings includes enterCode
                            typeof onabort[i].args[0] === 'undefined'   ) {                                     // empty argument -> always runs on abort     
                        $.wiki(onabort[i].contents);
                    }
                }
            }

        }
        else {
            
            // run any scripts for leaving
            if (runPayloads) {
                for (let i = 0; i < onleave.length; i++) {
                    if (    Array.isArray(onleave[i].args[0]) && onleave[i].args[0].includes(leaveCode)     ||  // array input includes leaveCode
                            onleave[i].args.includes(leaveCode)     ||                                          // string or list of strings includes leaveCode
                            typeof onleave[i].args[0] === 'undefined'   ) {                                     // empty argument -> always runs on leaving
                        $.wiki(onleave[i].contents);
                    }
                }
            }

            // update new position
            State.setVar(thisRose.position,newCode);

            // run any scripts for moving
            if (runPayloads) {
                if (typeof onmove[0] !== 'undefined') {                                                         // onmove has no arguments, always runs
                    $.wiki(onmove[0].contents); 
                }
            }

            if (thisRose.autoupdate || forceUpdate) {
                // delete old attribute values
                $('.macro-regionrose-dir')
                                            .attr('data-posCode','')
                                            .attr('data-posName','');
                // go through each direction & update new links
                for (let i = 0; i < directions.length; i++) {

                    let d = directions[i];

                    const $dir = $(`.macro-regionrose-dir[data-rosedir=${d}]`);
                    this.createPlaceLinks(thisMap,d,$dir,disableLinks);
                }
            }

            // run any scripts for entering
            if (runPayloads) {
                for (let i = 0; i < onenter.length; i++) {
                    if (    Array.isArray(onenter[i].args[0]) && onenter[i].args[0].includes(enterCode)     ||  // array input includes enterCode
                            onenter[i].args.includes(enterCode)     ||                                          // string or list of strings includes enterCode
                            typeof onenter[i].args[0] === 'undefined'   ) {                                     // empty argument -> always runs on entering
                        $.wiki(onenter[i].contents);
                    }
                }
            }

        }

    },

    handler() {


        
        // throw error if no arguments
        if (this.args.length === 0) {
            return this.error('no region map name specified')
        }
        const thisMap = Macro.get('regionmap').allMaps[this.args[0]];

        // throw error if map was not found
        if (typeof thisMap === 'undefined') {
            return this.error('region map was not found')
        }
        

        // create argument object
        this.argObj = Macro.get('regionmap').argsToObj(this.args,1);

        // throw error if no position input
        if (typeof this.argObj.position === 'undefined') {
            return this.error('no position story variable was input')
        }

        // throw error if values of appropriate properties are not story variables
        // removed enterName & leaveName for now

        // for (const key of ['position','enterCode','enterName','leaveCode','leaveName']) {
        //     if (typeof this.argObj[key] !== 'undefined' && this.argObj[key].toString().first() !== '$') {
        //         return this.error(`property value, ${key}, input was not a story variable`)
        //     }
        // }
        for (const key of ['position','enterCode','leaveCode']) {
            if (typeof this.argObj[key] !== 'undefined' && this.argObj[key].toString().first() !== '$') {
                return this.error(`property value, ${key}, input was not a story variable`)
            }
        }


        // map arguments onto thisRose, clear all previously assigned variables
        // removed enterName & leaveName for now
        // this.self.allRoses[thisMap.name] = {name: thisMap.name, position: undefined, enterCode: undefined, enterName: undefined, leaveCode: undefined, leaveName: undefined, abort: undefined, hide: undefined, disable: undefined};
        this.self.allRoses[thisMap.name] = {name: thisMap.name, position: undefined, enterCode: undefined, leaveCode: undefined, autoupdate: undefined, abort: undefined, hide: undefined, disable: undefined};
        const thisRose = this.self.allRoses[thisMap.name];
        Object.assign(thisRose,this.argObj);

        // autoupdate by default
        thisRose.autoupdate ??= true;
        
        const posCode = State.getVar(thisRose.position);

        // if position not found on region map, return error
        if (typeof thisMap.regions[posCode] === 'undefined') {
            return this.error('position was not found in region map')
        }


        // grab hide disable and abort vars from tags, assign only if not previously assigned from ^
        for (const t of ['hide','disable','abort']) {
            const tag = this.payload.filter( e => e.name === t );
            // only assign if not previously assigned
            thisRose[t] ??=     typeof tag[0] === 'undefined'   ?   undefined :                                           // no child tag found
                                tag[0].args.length === 1        ?   tag[0].args[0] :                                      // only one argument
                                                                    Macro.get('regionmap').argsToObj(tag[0].args,0,t);    // feed into arg object parser

            // throw error if empty object returned, means no arguments given
            if (typeof thisRose[t] === 'object' && Object.keys(thisRose[t]).length === 0) {
                return this.error(`${t} tag input cannot be empty`)
            }
            // throw error if defined and not string or object
            if (typeof thisRose[t] !== 'undefined' && typeof thisRose[t] !== 'string' && typeof thisRose[t] !== 'object') {
            return this.error(`${t} tag invalid input: must be a story variable, a space separated string list, or an object`)
            }
            // throw error if string and not a story variable
            if (typeof thisRose[t] === 'string' && thisRose[t].first() !== '$') {
                return this.error(`${t} tag invalid input: must be a story variable, a space separated string list, or an object`)
            }

        }


        // move payloads onto macro definition
        thisRose.payload = {};
        for (const p of ['onmove','onenter','onleave','onabort','onattempt']) {
            thisRose.payload[p] = this.payload.filter( e => e.name === p );
        }


        // generate rose element
        const $rose = $(document.createElement('div'));

        $rose
                .addClass('macro-regionrose')
                .attr('data-regionmap',thisMap.name);


        // fill out each direction with output elements
        const directions = thisMap.wind === 8 ? ['center','north','northeast','east','southeast','south','southwest','west','northwest'] : ['center','north','east','south','west'];
        for (let i = 0; i < directions.length; i++) {

            const d = directions[i];
            const $dir = $(document.createElement('div'));

            $dir
                    .addClass('macro-regionrose-dir')
                    .attr('data-rosedir',d)

            const dPayload = this.payload.filter( e => e.name === d )[0];
            
            // check if payload exists
            // wrap or append output element as needed, depending on if _contents exists inside payload
            if (typeof dPayload !== 'undefined') {
                if (dPayload.contents.includes('_contents')) {
                    const dWrapper = dPayload.contents.split('_contents');
                    $dir.wiki(String(dWrapper[0]) + `<div class='macro-regionrose-output' data-rosedir=${d}></div>` + String(dWrapper [1]));
                }
                else {
                    $dir.wiki(`<div class='macro-regionrose-output' data-rosedir=${d}></div>`);
                    $dir.wiki(dPayload.contents);
                }
            }
            else {
                $dir.wiki(`<div class='macro-regionrose-output' data-rosedir=${d}></div>`);
            }

            // add links to output elements
            this.self.createPlaceLinks(thisMap,d,$dir);

            // add directions to rose
            $dir.appendTo($rose);
        }


        // if rose payload has something, wiki it
        if (this.payload[0].contents !== '') {
            $rose.wiki(this.payload[0].contents);
        }
        

        // add rose to output
        $rose.appendTo(this.output);

    }
});


// aux macro to force rose update
Macro.add('roseupdate', {
    handler() {

        // whether to run payloads, default false
        const runPayloads   = this.args.includes(':forcecode');
        this.args.delete(':forcecode');
        const disableLinks  = this.args.includes(':disableall');
        this.args.delete(':disableall');
        const forceUpdate   = ! this.args.includes(':suppress');
        this.args.delete(':suppress');

        const params = {
            runPayloads     : runPayloads,
            disableLinks    : disableLinks,
            forceUpdate     : forceUpdate,
        };
        
        // if no name provided, grab first found rose
        const name = this.args[0] ??= $('.macro-regionrose').attr('data-regionmap');

        if (typeof name === 'undefined') {
            return this.error("no rose found on page")
        }


        const thisMap = Macro.get('regionmap').allMaps[name];
        const thisRose = Macro.get('regionrose').allRoses[name];

        // throw error if map or rose definition was not found
        if (typeof thisMap === 'undefined') {
            return this.error('map definition was not found')
        }
        if (typeof thisRose === 'undefined') {
            return this.error('rose definition was not found')
        }

        const posCode = State.getVar(thisRose.position);
        Macro.get('regionrose').updateRose(thisMap,posCode,params);
    }
});


// aux macro to enable disable rose links
Macro.add(['rosedisable','roseenable'], {
    handler() {
        if (this.args.length === 0) {
            $('.macro-regionrose-output a').ariaDisabled(this.name === 'rosedisable');
        }
        else {
            $(`.macro-regionrose-output a[data-posCode=${this.args[0]}]`).ariaDisabled(this.name === 'rosedisable');
        }
    }
});

// aux macro to show hide rose links
Macro.add(['roseshow','rosehide'], {
    handler() {
        if (this.args.length === 0) {
            $('.macro-regionrose-output a').toggle(this.name === 'roseshow');
        }
        else {
            $(`.macro-regionrose-output a[data-posCode=${this.args[0]}]`).toggle(this.name === 'roseshow');
        }
    }
});