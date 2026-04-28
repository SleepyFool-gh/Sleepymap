---
title: Sleepy Macros — Areamap library
---

<!-- stylesheet -->
<link rel='stylesheet' href='./style.css'>

<!--
 █████  ████   ████
   █   █    █ █
   █   █    █ █
   █   █    █ █
   █    ████   ████
 SECTION: toc / table of contents
-->
<div id='toc-wrapper'>
<a id='sf-link' href='https://sleepyfool-gh.github.io/Sleepy_macros/'>
    <h1>Sleepy Macros</h1>
</a>
<aside id='toc' markdown='1'>
<h2>Table of Contents</h2>

- **[Intro](#intro)**
- **[Macros](#macros)**
    - *Initialization*
        - [`<<new_areamap>>`](#macro-new_areamap)
    - *Interface Items*
        - [`<<place_arearose>>`](#macro-place_arearose)
        - [`<<update_arearose>>`](#macro-update_arearose)
        - [`<<place_mapview>>`](#macro-place_mapview)
        - [`<<update_mapview>>`](#macro-update_mapview)
    - *Scripts*
        - [`<<set_areascripts>>`](#macro-set_areascripts)
    - *Movement*
        - [`<<areamapmove>>`](#macro-areamapmove)
- **[JavaScript Methods](#javascript)**
    - *Initialization*
        - [`new_areamap`](#javascript-new_areamap)
    - *Interface Items*
        - [`create_rose`](#javascript-create_rose)
        - [`update_rose`](#javascript-update_rose)
        - [`create_mapview`](#javascript-create_mapview)
        - [`update_mapview`](#javascript-update_mapview)
    - *Scripts*
        - [`set_areascripts`](#javascript-set_areascripts)
    - *Movement*
        - [`begin_mapmove`](#javascript-begin_mapmove)
    - *Utilities*
        - [`get_map`](#javascript-get_map)
        - [`edit_map`](#javascript-edit_map)
- **[Events](#events)**
    - [`areamap:mapmove_began`](#events-mapmove_began)
    - [`areamap:mapmove_resolved`](#events-mapmove_resolved)
    - [`areamap:map_edited`](#events-map_edited)
- **[Options](#options)**
</aside>
</div>




<section id='main' markdown='1'>
<!--
 ███ █    █ █████ ████   ████
  █  ██   █   █   █   █ █    █
  █  █ █  █   █   ████  █    █
  █  █  █ █   █   █   █ █    █
 ███ █   ██   █   █   █  ████
 SECTION: intro
-->

<h1 id='intro'><code>Areamap</code> Library</h1>

`Areamap` is a map library for SugarCube designed for room-to-room movement like **Darkest Dungeon** or node-to-node movement like **Faster Than Light** — NOT for grid movement like **Zelda** or **Final Fantasy Tactics**.

`Areamap` takes a space-separated 2D text grid and converts it into a functional map for player navigation (`mapmove`). All grid spaces with the same `maparea` id will be treated as one big room, regardless of how many grid spaces it occupies or whether it is continuous.

[Get the map library here](https://github.com/SleepyFool-gh/areamap)

<video width="635" height="558" controls>
  <source src="./demo/small_house.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

#### Features:

- **Built-in navigation options:**
    1) compass rose with directional buttons (`rose`)
    2) visual map with optionally clickable `mapareas` (`mapview`)
- **TwineScripts payloads:** Scripts can be assigned to run at various stages of the `mapmove` process.
- **Separation of map logic & map view:** The 2D grid used to generate the `mapview` can be configured independently from the 2D grid useed for map logic.
- **Linked `story variables`:** Map state can be linked to `story variables` for map behavior manipulation.
- **Movement link manipulation:** Movement links can be `hidden` (links hidden), `disabled` (links disabled, `mapmove` prevented), or `blocked` (links available, `mapmove` attempted but fails).
- **JavaScript methods:** for manipulating `areamaps`, `roses`, and `mapviews`
- **Configurable defaults:** for various settings

<p align="center">
    &bull; &bull; &bull;
</p>




<!--
 █    █  ███   ████ ████   ████   ████
 ██  ██ █   █ █     █   █ █    █ █
 █ ██ █ █████ █     ████  █    █  ███
 █    █ █   █ █     █   █ █    █     █
 █    █ █   █  ████ █   █  ████  ████
 SECTION: macros
-->

<h2 id="macros">Macros</h2>

<h3 id="macro-new_areamap"><code>&lt;&lt;new_areamap&gt;&gt;</code></h3>
Defines a new `areamap`. This macro **must** be called in `StoryInit`. It accepts a 2D grid layout via its contents and supports optional child tags for advanced configuration.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `start`: (string) starting position in map, must be a valid `maparea` id
    - `columns`: (number) # of columns in the logic representation grid
    - `diagonals`: (boolean) *(optional)* whether diagonal movement is allowed
- **Contents:** 
    - 2D space-separated text grid representing map logic, must be rectangular.
- **Child Tags:**
    - `<<mapview>>`: Defines a different 2D grid to use for `mapview` instead of the map logic grid
        - **Arguments:** `columns` (number) # of columns in the visual representation grid
        - **Contents:** 2D space-separated grid, must be rectangular.
    - `<<mapvars>>`: Links map state to `story variables` for map behavior manipulation. `position` will update automatically when `mapmove` succeeds. These must all be `story variables` names starting with `$`.
        - **Arguments:** 
            - `position`: (string) stores current `areamap` position, as a string
            - `disabled`: (string) *(optional)* stores whether `rose` and `mapview` links to each `maparea` are shown but disabled, as an object of booleans
            - `hidden`: (string) *(optional)* stores whether `rose` and `mapview` links to each `mapareea` should be hidden, as an object of booleans
            - `blocked`: (string) *(optional)* stores whether `mapmove` to each `maparea` should fail, as an object of booleans
            - `frozen`: (string) *(optional)* stores whether ALL `rose` and `mapview` links for an `areamap` are `disabled`, as a boolean
    - `<<mapareas>>`: Defines additional metadata for each `maparea`. Partial objects will be filled with default values.
        - **Arguments:**
            - `name`: (string) *(optional)* used for links in `roses` & for the `show_names` option in `mapviews`, default is the `maparea` id
            - `type`: ("floor"|"wall") *(optional)* `floors` can be occupied by a player, `walls` can't and block movement; default `"floor"`
            - `tile`: (HTML string) *(optional)* inserted into each space in the `mapview`, default none
- **Examples:**
    ```js
    <<set _mapareas = {
        MB: {name: 'Master Bedroom'},
        GB: {name: 'Guest Bedroom'},
        HW: {name: 'Hallway'},
        LR: {name: 'Living Room'},
        ST: {name: 'Stairs'},
        DR: {name: 'Dining Room'},
        KT: {name: 'Kitchen'},
        PT: {name: 'Pantry'},
    }>>
    <<new_areamap 
        mapname     'small_house'
        columns     7
        diagonals   false
        start       'KT'
    >>
        .   .   .   .   LR  LR  LR
        .   KT  .   .   LR  .   ST
        PT  DR  ST  .   HW  .   .
        .   .   .   .   HW  .   .
        .   .   .   .   HW  GB  .
        .   .   .   .   MB  .   .
    <<mapview 
        columns     16
    >>
        .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .
        .   .   .   .   KT  KT  KT  KT  KT  .   LR  LR  LR  LR  LR  .
        .   .   .   .   KT  KT  KT  KT  KT  .   LR  LR  LR  LR  LR  .
        .   PT  PT  PT  KT  KT  KT  KT  KT  .   LR  LR  LR  LR  LR  .
        .   PT  PT  PT  DR  DR  DR  DR  ST  .   HW  GB  GB  GB  ST  .
        .   PT  PT  PT  DR  DR  DR  DR  ST  .   HW  GB  GB  GB  ST  .
        .   PT  PT  PT  DR  DR  DR  DR  DR  .   HW  MB  MB  MB  MB  .
        .   PT  PT  PT  DR  DR  DR  DR  DR  .   HW  MB  MB  MB  MB  .
        .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .
    <<mapareas _mapareas>>
    <</new_areamap>>
    ```


<h3 id='macro-place_arearose'><code>&lt;&lt;place_arearose&gt;&gt;</code></h3>
Generates a 3x3 grid of directional links for navigation.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `rose` automatically updates after each `mapmove` or when the areamap changes, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element for the `rose`
- **Examples:**
    ```js
    <<place_arearose
        mapname     'small_house'
        background  '<img src="./assets/rose.png">'
    >>
    ```


<h3 id='macro-update_arearose'><code>&lt;&lt;update_arearose&gt;&gt;</code></h3>
Manually updates a `rose` element.

- **Arguments:** 
    - `rose`: (selector string) jQuery selector for the `rose` element to update
- **Examples:**
    ```js
    <<update_arearose rose '.macro-areamap-rose'>>
    ```


<h3 id='macro-place_mapview'><code>&lt;&lt;place_mapview&gt;&gt;</code></h3>
Renders a visual representation of the `areamap` with the tiles configured in the `<<mapareas>>` child tag of `<<new_areamap>>`, using the 2D grid defined in the `<<mapview>>` child tag of `<<new_areamap>>`. If no `<<mapview>>` was used, the 2D logic map is used. Can optionally be made clickable for navigation or to display maparea names.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `mapview` automatically updates after each `mapmove` or when the `areamap` changes, default set in `options`
    - `clickable`: (boolean) *(optional)* whether mapareas can be clicked to navigate, default set in `options`
    - `show_names`: (boolean) *(optional)* whether to display names for each `maparea`, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element for the `mapview`
- **Examples:**
    ```js
    <<place_mapview
        mapname     'small_house'
        background  '<img src="./assets/small_house.png">'
    >>
    ```


<h3 id='macro-update_mapview'><code>&lt;&lt;update_mapview&gt;&gt;</code></h3>
Manually updates a `mapview` element.

- **Arguments:** 
    - `mapview`: (selector string) jQuery selector for the `mapview` element to update
- **Examples:**
    ```js
    <<update_mapview mapview '.macro-areamap-mapview'>>
    ```


<h3 id='macro-set_areascripts'><code>&lt;&lt;set_areascripts&gt;&gt;</code></h3>
Assigns TwineScript logic to run during the `mapmove` process. Arguments can be used to control which `mapareas` trigger the scripts. This macro **must** be called in `StoryInit`. Child tag order is preserved, but `<<onmapattempt>>` tags always run first, followed by:
    - when `mapmove` succeeds: `<<onmapstart>>` then `<<onmapend>>`
    - when `mapmove` fails: `<<onmapabort>>`

- **Arguments:**
    - `mapname`: (string) name of `areamap`
- **Child Tags:**
    - `<<onmapattempt>>`: Always runs, immediately when a mapmove is attempted
    - `<<onmapstart>>`: Only runs when `mapmove` succeeds, before position is updated
    - `<<onmapend>>`: Only runs when mapmove succeeds, after position is updated
    - `<<onmapabort>>`: Only runs when mapmove fails
    - **Arguments:** All these child tags take the same arguments
        - `to`: (string|array\<string\>|"any") *(optional)* id(s) of the `maparea` the player is moving to; either as a string, an array of strings, or "any"
        - `from`: (string|array\<string\>|"any") *(optional)* id(s) of the `maparea` the player is moving from; either as a string, an array of strings, or "any"
    - **Contents:**
        - TwineScript to run when the tag is triggered
- **Examples:**
    ```js
    <<set_areascripts mapname 'small_house'>>
        <<onmapattempt>>
            <<run $time++>>
        <<onmapstart from 'ST'>>
            <<run $energy-->>
        <<onmapend to ['KT', 'PT']>>
            <<run $hunger++>>   
    <</set_areascripts>>
    ```


<h3 id='macro-areamapmove'><code>&lt;&lt;areamapmove&gt;&gt;</code></h3>
Manually triggers a `mapmove` attempt. Using this macro circumvents any checks that the target `maparea` is a neighboring `maparea`, allowing for more flexible navigation — but `blocked` will still apply and cause the `mapmove` to fail.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `target`: (string) `maparea` to move to
    - `force_abort`: (boolean) *(optional)* `true` forces the `mapmove` to fail, default `false`
- **Examples:**
    ```js
    <<areamapmove mapname 'small_house' target 'MB'>>
    ```

<p align="center">
    &bull; &bull; &bull;
</p>




<!--
 █    █ █████ █████ █   █  ████  ████   ████
 ██  ██ █       █   █   █ █    █ █   █ █
 █ ██ █ ███     █   █████ █    █ █   █  ███
 █    █ █       █   █   █ █    █ █   █     █
 █    █ █████   █   █   █  ████  ████  ████
 SECTION: methods
-->

<h2 id='javascript'>JavaScript Methods</h2>

Javascript methods are stored on the `Areamap` window object. All methods take an `argObj` argument object.

<h3 id='javascript-new_areamap'>new_areamap</h3>
Creates a new `areamap`. The `<<new_areamap>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of `areamap`
    - `start`: (string) starting position on map, must be a valid `maparea` id
    - `columns`: (number) number of columns in the map grid
    - `maparray`: (array\<string\>) 1D array of `maparea` ids representing the map navigation logic, length must be divisible by `columns`
    - `diagonals`: (boolean) *(optional)* whether diagonal movement is allowed, default set in `options`
    - `mapview`: (object) *(optional)* data defining a separate grid for the mapview
        - `mapview.columns`: (number) number of columns in the `mapview` grid
        - `mapview.array`: (array\<string\>) 1D array of `maparea` ids representing the mapview navigation logic, length must be divisible by `mapview.columns`
    - `mapareas`: (object) *(optional)* additional metadata for `mapareas`, partial objects will be filled with default values
        - `mapareas.name`: (string) *(optional)* used for links in `roses` & for the `show_names` option in `mapviews`, default is the `maparea` id
        - `mapareas.type`: ("floor"|"wall") *(optional)* `floors` can be occupied by a player, `walls` can't and block movement; default `"floor"`
        - `mapareas.tile`: (HTML string) *(optional)* inserted into each space in the `mapview`; default `undefined`
    - `mapvars`: (object) *(optional)* data defining links to `story variables`, `position` will update automatically when `mapmove` succeeds — these must all be `story variables` names starting with `$`
        - `mapvars.position`: (string) stores current `areamap` position, as a string
        - `mapvars.disabled`: (string) *(optional)* stores whether `rose` and `mapview` links to each `maparea` are shown but disabled, as an object of booleans
        - `mapvars.hidden`: (string) *(optional)* stores whether `rose` and `mapview` links to each `mapareea` should be hidden, as an object of booleans
        - `mapvars.blocked`: (string) *(optional)* stores whether `mapmove` to each `maparea` should fail, as an object of booleans
        - `mapvars.frozen`: (string) *(optional)* stores whether ALL `rose` and `mapview` links for an `areamap` are `disabled`, as a boolean
- **Examples:**
    ```js
    Areamap.new_areamap({
        mapname  : 'small_house',
        start    : 'ST',
        columns  : 3,
        maparray : ['ST', 'KT', 'PT', 'MB', 'GB', 'BB'],
        mapview  : {
            columns  : 3,
            array    : ['ST', 'KT', 'PT', 'MB', 'GB', 'BB']
        },
        mapareas: {
            ST : {name: 'Starting Room'},
            KT : {name: 'Kitchen'},
            PT : {name: 'Pantry'},
            MB : {name: 'Master Bedroom'},
            GB : {name: 'Guest Bedroom'},
            BB : {name: 'Bathroom'},
        },
    });
    ```


<h3 id='javascript-create_rose'>create_rose</h3>
Creates a jQuery `rose` element. The `<<place_arearose>>` macro calls this method and appends the result to the macro output.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `rose` automatically updates, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element
- **Returns:** (jQuery object) the created `$rose` element
- **Examples:**
    ```js
    Areamap.create_rose({
        mapname    : 'small_house',
        autoupdate : true,
        background : '<div>Background</div>',
    });
    ```


<h3 id='javascript-update_rose'>update_rose</h3>
Manually updates `rose` elements in the DOM. If the jQuery object passed to this method references multiple `roses`, all of them will update. Non-`rose` elements will be ignored. The `<<update_arearose>>` macro is a wrapper for this method. 

- **argObj Properties:**
    - `rose`: (jQuery object) the specific `$rose` element to refresh
- **Examples:**
    ```js
    Areamap.update_rose({
        rose: $('#rose-element'),
    });
    ```


<h3 id='javascript-create_mapview'>create_mapview</h3>
Creates a jQuery `mapview` element. The `<<place_mapview>>` macro calls this method and appends the result to the macro output.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `mapview` automatically updates, default set in `options`
    - `clickable`: (boolean) *(optional)* whether `mapareas` can be clicked to navigate, default set in `options`
    - `show_names`: (boolean) *(optional)* whether to display names for each `maparea`, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element
- **Returns:** (jQuery object) the created `$mapview` element
- **Examples:**
    ```js
    Areamap.create_mapview({
        mapname    : 'small_house',
        clickable  : true,
        background : '<div>Background</div>',
    });
    ```


<h3 id='javascript-update_mapview'>update_mapview</h3>
Manually updates `mapview` elements in the DOM. If the jQuery object passed to this method references multiple `mapviews`, all of them will update. Non-`mapview` elements will be ignored. The `<<update_mapview>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapview`: (jQuery object) the specific `$mapview` element to refresh
- **Examples:**
    ```js
    Areamap.update_mapview({
        mapview: $('#mapview-element'),
    });
    ```


<h3 id='javascript-set_areascripts'>set_areascripts</h3>
Assigns `TwineScript` logic to run during the `mapmove` process. The `<<set_areascripts>>` macro is a wrapper for this method.

- **Script Types:**
    - `onmapattempt`: always fire, immediately before `mapmove` pass/fail is determined
    - `onmapstart`: fires if `mapmove` succeeds, immediately before the player's location is updated
    - `onmapend`: fires if `mapmove` succeeds, immediately after the player's location is updated
    - `onmapabort`: fires if `mapmove` fails
- **argObj Properties:**
    - `mapview`: (jQuery object) the specific `$mapview` element to refresh
    - `scripts`: (array\<object\>) array of script objects, each object contains:
        - `scripts[].type`: (`"onmapattempt"`|`"onmapstart"`|`"onmapend"`|`"onmapabort"`) the script trigger
        - `scripts[].contents`: (string) the `TwineScript` code to execute
        - `scripts[].areas`: (object)
            - `scripts[].areas.to`: (string|array\<string\>|"any") *(optional)* id(s) of the `maparea` the player is moving to
            - `scripts[].areas.from`: (string|array\<string\>|"any") *(optional)* id(s) of the `maparea` the player is moving from
- **Examples:**
    ```js
    Areamap.set_areascripts({
        mapview: $('#mapview-element'),
        scripts: [
            {
                type: 'onmapattempt',
                contents: '<<run $time++>>',
            },
            {
                type: 'onmapstart',
                contents: '<<run $energy-->>',
                areas: {
                    from: 'ST',
                },
            },
            {
                type: 'onmapend',
                contents: '<<run $hunger++>>',
                areas: {
                    to: ['KT', 'PT'],
                },
            },
        ],
    });
    ```


<h3 id='javascript-begin_mapmove'>begin_mapmove</h3>
Begins the `mapmove` procedure and fires the `areamap:mapmove_began` event. The `<<areamapmove>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `id_target`: (string) the `maparea` id to move to
    - `force_abort`: (boolean) *(optional)* `true` forces the `mapmove` to fail, default `false`
- **Examples:**
    ```js
    Areamap.begin_mapmove({
        mapname: 'small_house',
        id_target: 'PT',
        force_abort: false,
    });
    ```


<h3 id='javascript-get_map'>get_map</h3>
Retrieves a copy of a map object. Manipulating the returned object *will not* affect or update the original map. Use `Areamap.edit_map` to edit `areamaps`.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap` to retrieve
- **Returns:** An object containing the map's structure, including `mapname`, `columns`, `maparray`, `diagonals`, `mapview`, `mapareas`, `mapvars`, `exits`, and `scripts`.
- **Examples:**
    ```js
    const myMap = Areamap.get_map({
        mapname: 'small_house',
    });
    ```


<h3 id='javascript-edit_map'>edit_map</h3>
Allows for dynamic modification of an existing `areamap`. This method will automatically update the `areamap`'s navigation logic (exits) and update any `roses` or `mapviews` set to autoupdate.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap` to modify
    - `diagonals`: (boolean) *(optional)* new diagonal movement state
    - `columns`: (number) *(optional)* new column count, must form a rectangular grid with `maparray`
    - `maparray`: (array\<string\>) *(optional)* new logic grid array, must form a rectangular grid with `columns`
    - `mapview`: (object) *(optional)* new `mapview` configuration
        - `mapview.columns`: (number) *(optional)* new column count, must form a rectangular grid with `mapview.array`
        - `mapview.array`: (array\<string\>) *(optional)* new `mapview` array, must form a rectangular grid with `mapview.columns`
    - `mapareas`: (object) *(optional)* update metadata for one or more `mapareas`, incomplete objects will retain existing values for missing data
        - `mapareas.[id]`: (object)
            - `mapareas.[id].name`: (string) *(optional)* new name
            - `mapareas.[id].type`: ("floor"|"wall") *(optional)* new maparea type
            - `mapareas.[id].tile`: (HTML string) *(optional)* new HTML string to display in `maparea`
- **Examples:**
    ```js
    Areamap.edit_map({
        mapname: 'small_house',
        mapareas: {
            GB: {
                type: 'wall',
            },
        },
    });
    ```

<p align="center">
    &bull; &bull; &bull;
</p>




<!--
 █████ █   █ █████ █    █ █████  ████
 █     █   █ █     ██   █   █   █
 ███   █   █ ███   █ █  █   █    ███
 █      █ █  █     █  █ █   █       █
 █████   █   █████ █   ██   █   ████
 SECTION: events
-->

<h2 id='events'>Events</h2>

`Areamap` fires several events that allow for manipulating player movement and tracking map changes. All `Areamap` events fire off `#passages` and resolve on `document`. Authors that intend to intercept `Areamap` events should place their listeners on `#story`.

<h3 id='events-mapmove_began'>areamap:mapmove_began</h3>
Triggered immediately when any `mapmove` attempt begins

  - **Event Data:**
    - `mapname`: (string) name of the `areamap` triggering the `mapmove`
    - `id_origin`: (string) id of `maparea` the player is moving from
    - `id_target`: (string) id of `maparea` the player is moving to
    - `force_abort`: (boolean) true forces the `mapmove` to fail


<h3 id='events-mapmove_resolved'>areamap:mapmove_resolved</h3>
Triggered after any `mapmove` resolves

- **Event Data:**
    - `mapname`: (string) name of the `areamap` that triggered the `mapmove`
    - `id_origin`: (string) the `maparea` ID the player moved from
    - `id_target`: (string) the `maparea` ID the player moved to
    - `succeeded`: (boolean) whether the movement was successful


<h3 id='events-map_edited'>areamap:map_edited</h3>
Triggered after the `edit_map` method completes, useful if you need to perform additional UI updates not covered by the standard `autoupdate` functionality.

- **Event Data:**
    - `mapname`: (string) name of the `areamap` that was modified

<p align="center">
    &bull; &bull; &bull;
</p>




<!--
  ████  ████  █████ ███  ████  █    █  ████
 █    █ █   █   █    █  █    █ ██   █ █
 █    █ ████    █    █  █    █ █ █  █  ███
 █    █ █       █    █  █    █ █  █ █     █
  ████  █       █   ███  ████  █   ██ ████
 SECTION: options
-->

<h2 id='options'>Options</h2>

- **Default values:** can be overridden by passing in argumnts to their respective macros
    - `setup['@areamap/options'].default.wall_id`: (string) default id used to represent walls in the map grid
        - value: `.`
        - used in: `<<new_areamap>>` and `Areamap.new_map`
    - `setup['@areamap/options'].default.diagonals`: (boolean) whether diagonal movement is allowed
        - value: `false`
        - used in: `<<new_areamap>>` and `Areamap.new_map`
    - `setup['@areamap/options'].default.autoupdate_rose`: (boolean) whether the `rose` automatically updates
        - value: `true`
        - used in: `<<place_arearose>>` and `Areamap.create_rose`
    - `setup['@areamap/options'].default.autoupdate_mapview`: (boolean) whether the `mapview` automatically updates
        - value: `true`
        - used in: `<<place_mapview>>` and `Areamap.create_mapview`
    - `setup['@areamap/options'].default.clickable_mapview`: (boolean) whether the `mapview` is clickable
        - value: `true`
        - used in: `<<place_mapview>>` and `Areamap.create_mapview`
    - `setup['@areamap/options'].default.show_names_on_mapview`: (boolean) whether the `mapview` shows names for the `mapareas`
        - value: `false`
        - used in: `<<place_mapview>>` and `Areamap.create_mapview`
</section>