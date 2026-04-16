// regionmap macro
// used to define a map so that a player can navigate through it using the regionrose macro
// comes in both 4 and 8 wind variants
Macro.add('regionmap', {
    tags        :    ['regionwalls','regionnames'],
    allMaps     :    {},
    
    // aux function to convert arguments into an object, courtesy of Maliface
    argsToObj : function(args,i,source) {
        // defaults
        i ??= 0;
        source = typeof source === 'undefined' ? '' : `in ${source}`;
        // go through each argument, combine pairs into properties or assign existing object properties to output
        let argObj = {}
        while (i < args.length) {
            const arg = args[i];
            if (typeof arg === 'object') {//Merge objects!
                Object.assign(argObj, arg);
            } else {//Following pairs
                const val = args[i+1];
                i++;
                if (val === undefined){throw new Error(`uneven number of arguments${source}`)};
                argObj[arg] = val;
            }
            i++;
        }
        return argObj;
    },

    handler() {

        // if no map name, no map width, or no may layout, return error
        if (this.args.length < 2) {
            return this.error('region map name or width not specified');
        }
        if (! this.payload[0].contents.trim()) {
            return this.error('no region map layout provided')
        }


        // create map & define shorthand
        this.self.allMaps[this.args[0]] = {};
        const thisMap = this.self.allMaps[this.args[0]];
        thisMap.name = this.args[0];

        // grab map width
        thisMap.width = this.args[1];
        const width = thisMap.width;

        // make map array
        thisMap.mapArray = this.payload[0].contents.trim().split(/\s+/g);
        const mapArray = thisMap.mapArray;


        // grab alt walls if they exist
        const regionwalls = this.payload.filter( e => e.name === 'regionwalls' );

        thisMap.walls =     typeof regionwalls[0] === 'undefined'       ?   ['.'] :                     // no child tag found, default value
                            Array.isArray(regionwalls[0].args[0])       ?   regionwalls[0].args[0] :    // array input
                            typeof regionwalls[0].args[0] === 'string'  ?   regionwalls[0].args :       // string input
                                                                            undefined;                  // error catcher

        const walls = thisMap.walls;

        // throw error if regionwalls argument exists but isn't an array or string
        if (typeof walls === 'undefined') {
            return this.error('regionwalls must be space separated strings or an array')
        }
        // throw error if regionwalls input is empty
        if (typeof walls[0] === 'undefined') {
            return this.error('regionwalls input argument cannot be empty')
        }

        
        // grab alt names if they exist
        const regionnames = this.payload.filter( e => e.name === 'regionnames' );
        thisMap.altNames =  typeof regionnames[0] === 'undefined'   ?   undefined :                                                     // no child tag found
                            regionnames[0].args.length === 1        ?   regionnames[0].args[0] :                                        // only one argument
                                                                        this.self.argsToObj(regionnames[0].args,0,'regionnames');       // feed into arg object parser                
        // throw error if empty object returned, means no arguments given
        if (typeof thisMap.altNames === 'object' && Object.keys(thisMap.altNames).length === 0) {
            return this.error('regionnames tag input argument cannot be empty')
        }
        // throw error if defined and not string or object
        if (typeof thisMap.altNames !== 'undefined' && typeof thisMap.altNames !== 'string' && typeof thisMap.altNames !== 'object') {
            return this.error('regionnames tag invalid input: must be a story variable, a space separated string list, or an object')
        }
        // throw error if string and not a story variable
        if (typeof thisMap.altNames === 'string' && thisMap.altNames.first() !== '$') {
            return this.error('regionnames tag invalid input: must be a story variable, a space separated string list, or an object')
        }


        // get a list of all regions on the map
        const regionsList = [];
        mapArray.forEach( e => regionsList.pushUnique(e) );
        walls.forEach( e => regionsList.delete(e) );
        
        // create region object
        thisMap.regions = {};
        const regions = thisMap.regions;

        // check wind count
        thisMap.wind  = this.args.includes('8wind') ? 8 : 4;
        if (thisMap.wind === 8) {
            regionsList.forEach( e => regions[e] = {north: [], northeast: [], east: [], southeast: [], south: [], southwest: [], west: [], northwest: []} );
        }
        else {
            regionsList.forEach( e => regions[e] = {north: [], east: [], south: [], west: []} );
        }


        // populate regions object
        for (let i = 0; i < mapArray.length; i++) {

            let thisRegion = mapArray[i];

            // if this node is a wall, skip
            if (walls.includes(thisRegion)) {
                continue
            }

            // if not first row, check north
            if (i >= width) {
                let northRegion = mapArray[i-width];
                if (! walls.includes(northRegion) && northRegion !== thisRegion) {
                    regions[thisRegion].north.pushUnique(northRegion);
                }
            }
            // if not last column, check east
            if ((i+1) % width) {
                let eastRegion = mapArray[i+1];
                if (! walls.includes(eastRegion) && eastRegion !== thisRegion) {
                    regions[thisRegion].east.pushUnique(eastRegion);
                }
            }
            // if not last row, check south
            if (i < mapArray.length - width) {
                let southRegion = mapArray[i+width];
                if (! walls.includes(southRegion) && southRegion !== thisRegion) {
                    regions[thisRegion].south.pushUnique(southRegion);
                }
            }
            //if not first column, check west
            if (i % width) {
                let westRegion = mapArray[i-1];
                if (! walls.includes(westRegion) && westRegion !== thisRegion) {
                    regions[thisRegion].west.pushUnique(westRegion);
                }
            }

            // extra handling if 8wind rose
            if (thisMap.wind === 8) {
                // if not first row and not last column, check northeast
                if (i >= width && (i+1) % width) {
                    let northeastRegion = mapArray[i-width+1];
                    if (! walls.includes(northeastRegion) && northeastRegion !== thisRegion) {
                        regions[thisRegion].northeast.pushUnique(northeastRegion);
                    }
                }
                // if not last row and not last column, check southeast
                if (i < mapArray.length - width && (i+1) % width) {
                    let southeastRegion = mapArray[i+width+1];
                    if (! walls.includes(southeastRegion) && southeastRegion !== thisRegion) {
                        regions[thisRegion].southeast.pushUnique(southeastRegion);
                    }
                }
                // if not last row and not first column, check southwest
                if (i < mapArray.length - width && i % width) {
                    let southwestRegion = mapArray[i+width-1];
                    if (! walls.includes(southwestRegion) && southwestRegion !== thisRegion) {
                        regions[thisRegion].southwest.pushUnique(southwestRegion);
                    }
                }
                // if not first row and not first column, check northwest
                if (i >= width && i % width) {
                    let northwestRegion = mapArray[i-width-1];
                    if (! walls.includes(northwestRegion) && northwestRegion !== thisRegion) {
                        regions[thisRegion].northwest.pushUnique(northwestRegion);
                    }
                }
            }
        }

    }   
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