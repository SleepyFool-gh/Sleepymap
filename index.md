---
title: Sleepy Macros — Sleepymap library
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
<h1>Table of Contents</h1>

- **[Intro](#intro)**
- **[Macros](#macros)**
    - [*Initialization & Manipulation*](#macros-initialization)
        - [`<<new_map>>`](#macros-new_map)
        - [`<<set_mapnode>>`](#macros-set_mapnode)
        - [`<<set_mapstate>>`](#macros-set_mapstate)
        - [`<<connect_map>>`](#macros-connect_map)
        - [`<<disconnect_map>>`](#macros-disconnect_map)
    - [*Interface Items*](#macros-interface)
        - [`<<place_rose>>`](#macros-place_rose)
        - [`<<place_mapview>>`](#macros-place_mapview)
        - [`<<place_controller>>`](#macros-place_controller)
        - [`<<update_interface>>`](#macros-update_interface)
    - [*Movement & Entities*](#macros-movement)
        - [`<<mapmove>>`](#macros-mapmove)
        - [`<<set_mapscripts>>`](#macros-set_mapscripts)
        - [`<<new_entity>>`](#macros-new_entity)
        - [`<<set_entity>>`](#macros-set_entity)
        - [`<<delete_entity>>`](#macros-delete_entity)
- **[JavaScript Methods](#javascript)**
    - [*Initialization & Manipulation*](#javascript-initialization)
        - [`new_map`](#javascript-new_map)
        - [`get_map`](#javascript-get_map)
        - [`set_map`](#javascript-set_map)
        - [`edit_exits`](#javascript-edit_exits)
        - [`get_mapnode`](#javascript-get_mapnode)
        - [`set_mapnode`](#javascript-set_mapnode)
        - [`get_mapstate`](#javascript-get_mapstate)
        - [`set_mapstate`](#javascript-set_mapstate)
    - [*Interface Items*](#javascript-interface)
        - [`create_rose`](#javascript-create_rose)
        - [`create_mapview`](#javascript-create_mapview)
        - [`create_controller`](#javascript-create_controller)
        - [`update_interface`](#javascript-update_interface)
    - [*Movement & Entities*](#javascript-movement)
        - [`begin_mapmove`](#javascript-begin_mapmove)
        - [`find_path`](#javascript-find_path)
        - [`set_mapscripts`](#javascript-set_mapscripts)
        - [`set_entity`](#javascript-set_entity)
- **[Events](#events)**
    - [`mapmove_began`](#events-mapmove_began)
    - [`mapmove_resolved`](#events-mapmove_resolved)
    - [`map_edited`](#events-map_edited)
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
<h1 id='intro'>Sleepymap, a SugarCube Macro Library for 2D Maps</h1>

`Sleepymap` is a map library for SugarCube which takes a 2D text grid (`maparray`) and converts it into a functional map for player movement (`mapmove`). It has two modes:
1. **`node travel`:** Node-to-node movement like **Faster Than Light** or room-to-room movement like **Darkest Dungeon**. All grid spaces with the same id will be treated as one big room (`mapnode`) — regardless of how many grid spaces it occupies or whether it is continuous or not. Adjacent `mapnode` will be connected by `exits` that allow navigation between them. Because `mapnode` size is irrelevant, multiple links to different rooms may appear in the same direction on the `rose` (default, or set by `grid_travel = false`)
2. **`grid travel`:** Grid movement like **Zelda** or **Final Fantasy Tactics**. Adjacent grid spaces with the same id will inherit the same properties, but will need to be traversed through one grid space at a time. Each grid space is connected by `exits` to adjacent grid spaces it can reach. (set by `grid_travel = true`)

**Note:** `mapmove` *DOES NOT* trigger passage navigation. Authors **must** navigate to save map changes to `State`.

<div><a href='./demo/index.html'>Check out the demo here</a></div>
<div><a href='https://github.com/SleepyFool-gh/Sleepymap'>Get the map library here</a></div>

### Videos
<video controls>
  <source src="./demo/node_house.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
<video controls>
  <source src="./demo/grid_house.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

### Features:

- **Built-in `interfaces`:**
    - compass rose showing exits in each direction as links (`rose`)
    - visual map, optionally clickable `mapnodes`, optional pathing (`mapview`)
- **Built-in navigation:** Both `interfaces` have navigation options. Keyboard input can also be assigned with an invisible element (`controller`)
- **TwineScripts payloads:** Scripts can be assigned to run at various stages of the `mapmove` process and conditionally on nodes or grid spaces.
- **Linked `story variables`:** Map states are saved in `State` and survive passage navigations and saves/loads.
- **Manually adjust exits:** While exits are automatically generated from the provided `maparray`, it can be manually tweaked to create more complex navigation patterns.
- **`mapnode` behavior manipulation:** 
    - `hidden`: hides the `mapnode` on `interface` with opacity zero, but navigation still works
    - `disabled`: disables the `mapnode` on `interface`, but navigation still works if triggered manually
    - `blocked`: causes `mapmoves` through it to fail
    - `walled`: turns the `mapnode` into a wall, which prevents any movement attempts
- **Entity placement:** Entities can be set and moved around the `map` — though interactions must be handled by the author
- **JavaScript methods:** for manipulating maps, `mapnodes`, `mapstates`, `exits`,`roses`, `mapviews`,  and `entities`. 
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

<h1 id='macros'>Macros</h1>

Macro arguments *must* be keyed, but can be supplied in any order. Some macros arguments have aliases, or alternate accepted names. Some settings/arguments only work in `node travel` mode or only in `grid travel` mode.


<h2 id='macros-initialization'>Initialization & Manipulation</h2>


<h3 id='macros-new_map'><code>&lt;&lt;new_map&gt;&gt;</code></h3>

Defines a new `Sleepymap`. It accepts a 2D grid layout via its contents and supports optional child tags for advanced configuration.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `grid_travel`: (boolean) *(optional)* whether to use grid-based movement (default: `false`, node-to-node movement)
    - `start`: (string) *(`node travel`)* starting position in map, must be a valid `mapnode` id
    - `start_x`: (number) *(`grid travel`)* starting x coordinate
    - `start_y`: (number) *(`grid travel`)* starting y coordinate
    - `columns`: (number) # of columns in the logic representation grid
    - `diagonals`: (boolean) *(optional)* whether diagonal movement is allowed
- **Contents:** 
    - 2D text grid representing map logic, must be rectangular. By default, this text grid is split into individual grid cells by identifying spaces, but this can be changed in `options`. The default wall and thin borders (`barrier`) identifiers can also be changed in `options`. All these options require regex. For a mapnode with id `id`, the defaults are:
        - thick wall which occupies its own grid cell: `.`
        - thin border to N of grid cell: `"id` or `id"`
        - thin border to E of grid cell: `id|`
        - thin border to S of grid cell: `_id` or `id_`
        - thin border to W of grid cell: `|id`
        - thin border to NE of grid cell: `id\`
        - thin border to SE of grid cell: `id/`
        - thin border to SW of grid cell: `\id`
        - thin border to NW of grid cell: `/id`
- **Child Tags:**
    - `<<mapnodes>>`: (object) *(optional)* Defines additional metadata for each `mapnode`. Partial objects will be filled with default values.
        - `[mapnode id]`: (object) `mapnode` data object
            - `name`: (string) *(optional)* used for links in `roses` & for the `show_labels` option in `mapviews`, default is the `mapnode` id
            - `tile`: (HTML string) *(optional)* inserted into each space in the `mapview`, default none
            - `disabled`: (boolean) *(optional)* disables the `mapnode` on `interfaces`, default `false`
            - `hidden`: (boolean) *(optional)* hides the node and links on `interfaces` by setting opacity to zero, default `false`
            - `blocked`: (boolean) *(optional)* causes `mapmoves` through it to fail, default `false`
            - `walled`: (boolean) *(optional)* turns the node into a wall, default `false`
- **Examples:**
    ```js
    /* define mapnodes */
    <<set _mapnodes = {
        M: {name: 'Master Bedroom'},
        G: {name: 'Guest Bedroom'},
        H: {name: 'Hallway'},
        L: {name: 'Living Room'},
        S: {name: 'Stairs'},
        D: {name: 'Dining Room'},
        K: {name: 'Kitchen'},
        P: {name: 'Pantry'},
    }>>

    /* new node travel map */
    <<new_map 
        mapname     'node_house'
        columns     16
        start       'D'
    >>
        .   .   .   .   .   .   .   .    .   .   .   .   .   .    .   .
        .   .   .   .   K   K   K   K    K   .   L   L   L   L    L   .
        .   .   .   .   K   K   K   K    K   .   L   L   L   L    L   .
        .   P   P   P|  K_  K   K_  K_  _K   .   L   L_  L_  L_   L   .
        .   P   P   P|  D   D   D   D   |S   .   H  |G   G   G   |S   .
        .   P   P   P|  D   D   D   D   |S   .   H   G_  G_  G_ _|S   .
        .   P   P   P   D   D   D   D    D   .   H  |M   M   M    M   .
        .   P   P   P|  D   D   D   D    D   .   H   M   M   M    M   .
        .   .   .   .   .   .   .   .    .   .   .   .   .   .    .   .
    <<mapnodes _mapnodes>>
    <</new_map>>

    /* new grid travel map */
    <<new_map 
        mapname     'grid_house'
        columns     16
        grid_travel true
        start_x     4
        start_y     5
    >>
        .   .   .   .   .   .   .   .    .   .   .   .   .   .    .   .
        .   .   .   .   K   K   K   K    K   .   L   L   L   L    L   .
        .   .   .   .   K   K   K   K    K   .   L   L   L   L    L   .
        .   P   P   P|  K_  K   K_  K_  _K   .   L   L_  L_  L_   L   .
        .   P   P   P|  D   D   D   D   |S   .   H  |G   G   G   |S   .
        .   P   P   P|  D   D   D   D   |S   .   H   G_  G_  G_ _|S   .
        .   P   P   P   D   D   D   D    D   .   H  |M   M   M    M   .
        .   P   P   P|  D   D   D   D    D   .   H   M   M   M    M   .
        .   .   .   .   .   .   .   .    .   .   .   .   .   .    .   .
    <<mapnodes _mapnodes>>
    <</new_map>>
    ```


<h3 id='macros-set_mapnode'><code>&lt;&lt;set_mapnode&gt;&gt;</code></h3>

Updates the metadata for a specific `mapnode` in an existing `map`. Incomplete objects are accepted, only the specified properties will be updated. `mapnode` ids *cannot* be changed. `node travel` and `grid travel` maps use the same syntax.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `mapnode`: (string) id of the `mapnode` to modify
    - `data`: (object) object containing properties to update
        - `name`: (string) *(optional)* display name
        - `tile`: (HTML string) *(optional)* display tile to be printed in `mapview`
        - `disabled`: (boolean) *(optional)* disables the `mapnode` on `interfaces`
        - `hidden`: (boolean) *(optional)* hides the `mapnode` on `interfaces` by setting opacity to zero
        - `blocked`: (boolean) *(optional)* causes `mapmoves` through it to fail
        - `walled`: (boolean) *(optional)* turns the `mapnode` into a wall
- **Examples:**
    ```js
    /* lock the pantry */
    <<set _P = { name: 'Locked Pantry', blocked: true }>>
    <<set_mapnode
        mapname     'node_house'
        mapnode     'P'
        data        _P
    >>
    ```


<h3 id='macros-set_mapstate'><code>&lt;&lt;set_mapstate&gt;&gt;</code></h3>

Updates the operational state (`mapstate`) of a map, such as the current position, or toggles states like `blocked` or `hidden` for multiple mapnodes at once. `node travel` and `grid travel` maps use the same syntax. This macro will update `interface` items set to autoupdate.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `position`: (object) *(optional)* 
        - For `node travel`: 
            - `mapnode`: id of new `mapnode` position
        - For `grid travel`: 
            - `x`/`y`: (number) new x/y position
    - `frozen`: (boolean) *(optional)* disables *all* `interface` interactions if true
    - `disabled`: (object) *(optional)*
        - `[mapnode id]`: (boolean) whether the `mapnode` is disabled on `interfaces`
    - `hidden`: (object) *(optional)*
        - `[mapnode id]`: (boolean) whether the `mapnode` is hidden on `interfaces`
    - `blocked`: (object) *(optional)*
        - `[mapnode id]`: (boolean) whether the `mapnode` causes `mapmoves` through it to fail
    - `walled`: (object) *(optional)*
        - `[mapnode id]`: (boolean) whether the `mapnode` is a wall
- **Examples:**
    ```js
    /* reposition player without triggering any scripts or events */
    <<set _position = { x: 10, y: 5 }>>
    <<set_mapstate
        mapname     'grid_house'
        position    _position
    >>

    /* unlock pantry and hide both bedrooms */
    <<set _blocked = { 'P': false }>>
    <<set _hidden = { 'M': true, 'G': true }>>
    <<set_mapstate
        mapname     'node_house'
        blocked     _blocked
        hidden      _hidden
    >>
    ```


<h3 id='macros-connect_map'><code>&lt;&lt;connect_map&gt;&gt;</code></h3>

Manually creates a new exit between two `mapnodes` or two grid coordinates. If this is a `node travel` map, specify `from`/`to`. If this is a `grid travel` map, specify `from_x`/`from_y`/`to_x`/`to_y`. This macro does *not* automatically add the reciprocal exit from the provided inputs and can create one-way exits.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `dir`: (string) the direction of the connection ("N", "E", "S", "W", "NE", "SE", "SW", "NW")
        - aliases: `direction`
    - `from`/`to`: (string) *(`node travel`)* ids of the nodes to connect
    - `from_x`/`from_y`/`to_x`/`to_y`: (number) *(`grid travel`)* coordinates to connect
- **Examples:**
    ```js
    /* node travel, create secret passage from master bedroom to pantry */
    <<connect_map 
        mapname     'node_house' 
        from        'M' 
        to          'P' 
        dir         'S' 
    >>

    /* grid travel, connect bottom floor stairs to top floor stairs */
    <<connect_map
        mapname     'grid_house'
        from_x      8
        from_y      4
        to_x        14
        to_y        5
        direction   'N'
    >>
    ```


<h3 id='macros-disconnect_map'><code>&lt;&lt;disconnect_map&gt;&gt;</code></h3>

Removes an exit that was automatically created between two `mapnodes` or grid coordinates from the `maparray`. If this is a `node travel` map, specify `from` and `to`. If this is a `grid travel` map, specify `from_x`, `from_y`, `to_x`, and `to_y`. If no `dir` is specified, it will be removed from *all* directions. This macro does *not* automatically remove the reciprocal exit from the provided inputs and can create one-way exits.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `dir`: (string) the direction of the connection to remove
        - aliases: `direction`
    - `from`/`to`: (string) *(`node travel`)* ids of the nodes to disconnect
    - `from_x`/`from_y`/`to_x`/`to_y`: (number) *(`grid travel`)* coordinates to disconnect
- **Examples:**
    ```js
    /* removes the exit from kitchen to dining room,
        making leaving the kitchen impossible */
    <<disconnect_map 
        mapname   'node_house' 
        from      'K' 
        to        'D' 
    >>
    ```


<h2 id='macros-interface'>Interface Items</h2>


<h3 id='macros-place_rose'><code>&lt;&lt;place_rose&gt;&gt;</code></h3>

Generates a 3x3 grid of directional links for navigation.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `background`: (HTML string) *(optional)* inserted as a background element for the `rose`
        - aliases: `bg`
    - `enabled`: (boolean\|TwineScript string) *(optional)* whether the `rose` is enabled, by default will check the `map`'s `frozen` value
    - `autoupdate`: (boolean) *(optional)* whether the `rose` automatically updates after each `mapmove` or when the `map` changes, default set in `options`
    - `clickable` : (boolean) *(optional)* whether the `rose` items are clickable links, default set in `options`
- **Examples:**
    ```js
    /* places a rose that doesn't autoupdate */
    <<place_rose
        mapname     'grid_house'
        background  '<img src="./assets/small_house.png">'
        autoupdate  false
    >>
    ```


<h3 id='macros-place_mapview'><code>&lt;&lt;place_mapview&gt;&gt;</code></h3>

Renders a visual representation of the `map` with the tiles using the `maparray`. Options include clickable tiles, `mapnode` labels, path highlighting (`grid travel` only), and quick moving to distant tiles (`grid travel` only).

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `background`: (HTML string) *(optional)* inserted as a background element for the `mapview`
        - aliases: `bg`
    - `enabled`: (boolean\|TwineScript string) *(optional)* whether the `mapview` is enabled, by default will check the `map`'s `frozen` value
    - `autoupdate`: (boolean) *(optional)* whether the `mapview` automatically updates after each `mapmove` or when the `map` changes, default set in `options`
    - `clickable`: (boolean) *(optional)* whether nodes can be clicked to navigate, default set in `options`
    - `show_labels`: (boolean) *(optional)* whether to display labels (names or directional icons) for each node, default set in `options`
    - `pathing`: (boolean) *(optional)* whether to highlight the path to the hovered tile, default set in `options`
    - `quickmove`: (boolean) *(optional)* whether clicking a distant traversable tile initiates multiple sequential `mapmoves`, default set in `options`, the `mapview` *must* be clickable to enable `quickmove`
- **Examples:**
    ```js
    /* places a mapview that has quickmove disabled & pathing enabled */
    <<place_mapview
        mapname     'grid_house'
        background  '<img src="./assets/small_house.png">'
        quickmove   false
        pathing     true
    >>
    ```

    
<h3 id='macros-place_controller'><code>&lt;&lt;place_controller&gt;&gt;</code></h3>

Creates an invisible element that controls a listener on `document` for `keyup` events to trigger `mapmoves`. Removing the element removes the listener. Every provided property must match for the `mapmove` to trigger — which means the `controller` only triggers `mapmove` to adjacent `exits` when a `dir` is provided, and teleports when a `dir` is not provided.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `enabled`: (boolean\|TwineScript string) *(optional)* whether the `controller` is enabled, by default will check the `map`'s `frozen` value
    - `keys`: (object) map of key codes to target movement objects
        - `[key]`: (object) `keyup` event `key` value
            - `dir`: (string) *(optional)* directional exit to follow ("N", "E", "S", "W", "NE", "SE", "SW", "NW")
            - `mapnode`: (string) *(optional)* target `mapnode` id
            - `x`/`y`: (number) *(optional)* target x/y coordinate
- **Examples:**
    ```js
    /* set up wasd control for movement to adjacent spaces */
    <<set _keys = {
        w: { dir: 'N' },
        d: { dir: 'E' },
        s: { dir: 'S' },
        a: { dir: 'W' },
    }>>
    <<place_controller
        mapname     'grid_house'
        keys        _keys 
    >>

    /* set up a dedicated key to teleport to the dining room, 
        but only works from the outhouse */
    <<set
        _keys = { 
            r: { mapnode: 'D' },
        };
    >>
    <<place_controller
        mapname     'node_house'
        enabled     'Sleepymap.get_mapstate({ mapname: "node_house" }).mapnode === "O"'
        keys        _keys
    >>
    ```


<h3 id='macros-update_interface'><code>&lt;&lt;update_interface&gt;&gt;</code></h3>

Manually triggers an update for a `rose` or `mapview` element. This is useful if the author has manually modified `interface` items or turned off autoupdate.

- **Arguments:** 
    - `selector`: (selector string) jQuery selector for the interface element(s) to update
- **Examples:**
    ```js
    /* updates all mapviews on the page */
    <<update_interface selector '.macro-Sleepymap-mapview'>>
    ```


<h2 id='macros-movement'>Movement & Entities</h2>


<h3 id='macros-mapmove'><code>&lt;&lt;mapmove&gt;&gt;</code></h3>

Manually triggers a `mapmove` attempt. This macro *does not* check against exits — it will *teleport* the player regardless of distance or any `blocked` or `walled` `mapnodes` inbetween — but will fail if the *destination* is `blocked` or `walled`. `mapscripts` will be triggered as normal.

`target_mapnode`, `target_x`/`target_y` can both be used in either `node travel` or `grid travel` modes.  `node travel` will fetch the `mapnode` at the targeted x/y coordinate, and `grid travel` will fetch the first x/y coordinate with the targeted `mapnode`.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `target_mapnode`: (string) id of the node to move to
        - aliases: `mapnode`
    - `target_x`/`target_y`: (number) target x/y coordinates
        - aliases: `x`/`y`
    - `force_abort`: (boolean) *(optional)* `true` forces the `mapmove` to fail, default `false`
    - `skip_scripts`: (boolean) *(optional)* `true` to bypass all `mapscripts` for this `mapmove`, default `false`
- **Examples:**
    ```js
    /* teleport to master bedroom */
    <<mapmove mapname 'node_house' target_mapnode 'M'>>

    /* teleport to first grid cell of dining room */
    <<mapmove mapname 'grid_house' target_mapnode 'D'>>
    ```


<h3 id='macros-set_mapscripts'><code>&lt;&lt;set_mapscripts&gt;&gt;</code></h3>

Assigns TwineScript logic to run during the `mapmove` process (`mapscript`). Both `node travel` and `grid travel` can use any combination of `from`/`to`/`from_x`/`from_y`/`to_x`/`to_y`.  If multiple arguments are set, *all* must be true for the `mapscript` to fire. The `any` keyword can be used to signal that any value will trigger the `mapscript` (which does the same thing as not setting the argument at all).

Child tags of the same type will execute in the order they are defined — but `<<onmapattempt>>` tags will always run first, followed by:
    - `<<onmapstart>>` then `<<onmapend>>` if `mapmove` succeeds
    - `<<onmapabort>>` if `mapmove` fails

**Note:** Calling this on a `map` that already has `mapscripts` set will ***overwrite*** existing `mapscripts`!

- **Arguments:**
    - `mapname`: (string) name of `map`
- **Child Tags:**
    - `<<onmapattempt>>`: *(optional)* Always runs immediately when a `mapmove` is attempted.
    - `<<onmapstart>>`: *(optional)* Only runs when `mapmove` succeeds, before the position is updated.
    - `<<onmapend>>`: *(optional)* Only runs when `mapmove` succeeds, after the position is updated.
    - `<<onmapabort>>`: *(optional)* Only runs when `mapmove` fails.
    - **Arguments for all Child Tags:**
        - `from`/`to`: (string\|array&lt;string&gt;\|"any") *(optional)* id(s) of the node the player is moving from/to
        - `from_x`/`from_y`/`to_x`/`to_y`: (number\|array&lt;number&gt;\|"any") *(optional)* x/y coordinates player is moving from/to.
- **Contents:**
    - TwineScript code to execute when the conditions set in the arguments are met.
- **Examples:**
    ```js
    <<set_mapscripts mapname _mapname>>
        /* decrement energy whenever a mapmove is attempted */
        <<onmapattempt>>
            <<set $energy-->>
        /* increase heat when moving around upstairs */
        <<onmapattempt to `['L', 'H', 'G', 'M']`>>
            <<set $heat++>>
        /* ring a bell when coming down the stairs */
        <<onmapstart from 'S' to 'D'>>
            <<run console.log('Ding!')>>
        /* increase hunger when entering the kitchen or pantry */
        <<onmapend from 'D' to `['K', 'P']`>>
            <<set $hunger++>>
        /* tell <<redo>> to run any time mapmove succeeds */
        <<onmapend>>
            <<redo>>
    <</set_mapscripts>>
    ```


<h3 id='macros-new_entity'><code>&lt;&lt;new_entity&gt;&gt;</code></h3>

Creates a new entity on the map at the specified coordinates. This macro takes `x` and `y` inputs in both `node travel` and `grid travel`.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `entityname`: (string) unique identifier for the entity
    - `x`/`y`: (number) x/y coordinate
    - `tile`: (HTML string) *(optional)* display tile for the entity
- **Examples:**
    ```js
    /* places a kitty in the dining room */
    <<new_entity 
        mapname     'node_house' 
        entityname  'kitty' 
        x           7
        y           5
        tile        '🐱'
    >>
    ```


<h3 id='macros-set_entity'><code>&lt;&lt;set_entity&gt;&gt;</code></h3>

Updates the position or display tile of an existing entity. This macro takes `x` and `y` inputs in both `node travel` and `grid travel`.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `entityname`: (string) identifier of the entity to modify
    - `x`/`y`: (number) new x/y coordinate
    - `tile`: (HTML string) *(optional)* new display tile
- **Examples:**
    ```js
    /* move the kitty to the pantry */
    <<set_entity 
        mapname    'node_house' 
        entityname 'kitty' 
        x          2
        y          6
    >>
    ```


<h3 id='macros-delete_entity'><code>&lt;&lt;delete_entity&gt;&gt;</code></h3>

Removes an entity from the map.

- **Arguments:** 
    - `mapname`: (string) name of `map`
    - `entityname`: (string) identifier of the entity to remove
- **Examples:**
    ```js
    /* remove the kitty from the map */
    <<delete_entity 
        mapname    'node_house' 
        entityname 'kitty' 
    >>
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

<h1 id='javascript'>JavaScript Methods</h1>

Javascript methods are stored on the `Sleepymap` window object. All methods take an `argObj` argument object.


<h2 id='javascript-initialization'>Initialization & Manipulation</h2>


<h3 id='javascript-new_map'><code>new_map</code></h3>

Creates a new `Sleepymap`. The `<<new_map>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of `map`
    - `columns`: (number) number of columns in the logic representation grid
    - `maparray`: (array&lt;string&gt;) 1D array of `mapnode` ids representing the map navigation logic, length must be divisible by `columns`
    - `grid_travel`: (boolean) *(optional)* whether to use grid-based movement (default: `false`, node-to-node movement)
    - `start`: (string) *(`node travel`)* starting position on map, must be a valid `mapnode` id
    - `start_x`: (number) *(`grid travel`)* starting x coordinate
    - `start_y`: (number) *(`grid travel`)* starting y coordinate
    - `diagonals`: (boolean) *(optional)* whether diagonal movement is allowed, default set in `options`
    - `mapnodes`: (object) *(optional)* additional metadata for `mapnodes`, partial objects will be filled with default values
        - `[mapnode id]`: (object)
            - `name`: (string) *(optional)* used for links in `roses` & for the `show_labels` option in `mapviews`, default is the `mapnode` id
            - `tile`: (HTML string) *(optional)* inserted into each space in the `mapview`, default `undefined`
            - `disabled`: (boolean) *(optional)* disables the `mapnode` on `interfaces`, default `false`
            - `hidden`: (boolean) *(optional)* hides the `mapnode` by setting opacity to zero on `interfaces`, default `false`
            - `blocked`: (boolean) *(optional)* causes `mapmoves` through it to fail, default `false`
            - `walled`: (boolean) *(optional)* turns the node into a wall, default `false`
- **Examples:**
    ```js
    /* create a new node travel map */
    Sleepymap.new_map({
        mapname  : 'node_house',
        columns  : 16,
        start    : 'D',
        maparray : ['.', '.', '.', ...], // etc, rest of maparray
        mapnodes : {
            D : { name: 'Dining Room' },
            K : { name: 'Kitchen' },
            // etc, other mapnodes
        },
    });

    /* create a new grid travel map */
    Sleepymap.new_map({
        mapname     : 'grid_house',
        columns     : 16,
        grid_travel : true,
        start_x     : 4,
        start_y     : 5,
        maparray    : ['.', '.', '.', ...], // etc, rest of maparray
        mapnodes    : {
            D : { name: 'Dining Room' },
            K : { name: 'Kitchen' },
            // etc, other mapnodes
        },
    });
    ```


<h3 id='javascript-get_map'><code>get_map</code></h3>

Retrieves a copy of a map object. Manipulating the returned object *will not* affect or update the original map. Use `Sleepymap.set_map` to edit `maps`.

- **argObj Properties:**
    - `mapname`: (string) name of the `map` to retrieve
- **Returns:** An object containing the map's structure (see example below)
- **Examples:**
    ```js
    // get node_house object
    const node_house = Sleepymap.get_map({
        mapname: 'node_house',
    });
    // returns
    {
        mapname     : 'node_house',
        columns     : 16,
        diagonals   : false,
        grid_travel : false,
        frozen      : false,
        maparray    : ['.', '.', '.', ...], // etc, rest of maparray
        barriers    : [
            {N: false, E: false, W: false, S: false, NE: false, NW: false, SE: false, SW: false},
            // etc, maps 1:1 to maparray
        ],
        mapnodes: {
            D: { 
                id          : 'D',
                name        : 'Dining Room',
                disabled    : false,
                hidden      : false,
                blocked     : false,
                walled      : false,
            },
            // etc, other mapnodes
        },
        position: {
            mapnode : 'D',
            x       : 4,    // non-extant on node travel maps
            y       : 5,    // non-extant on node travel maps
        },
        exits: { // both node & grid exits always get generated in both modes
            node: {
                '.' : {},   // walls have no exits
                D: {
                    N: Set{'K', 'S'}, // exits point to other mapnode ids
                    W: Set{'P'},
                },
                // etc, other nodes
            },
            grid: [
                {
                    E: Set{20}, // exits point to other maparray indices
                    S: Set{36},
                },
                // etc, maps 1:1 to maparray
            ],
            manual: [
                {
                    removing: false, // manual connection, (true) for disconnections 
                    dir: 'N',
                    ​from_x: 8,
                    from_y: 4,
                    to_x: 14,
                    to_y: 5
                },
                // etc, both node & grid manual edits are stored here
            ],
        },
        scripts: [
            {
                type: 'onmapattempt',
                contents: '<<set $heat++>>',
                triggers: {
                    to: ['L', 'H', 'G', 'M'],
                },  
            },
            // etc, other mapscripts
        ],
        entities: {},
    }
    ```

<h3 id='javascript-set_map'><code>set_map</code></h3>

Allows for dynamic modification of an existing `map`. This method will automatically update the `map`'s `exits` and trigger an update for any `interfaces` set to autoupdate.

- **argObj Properties:**
    - `mapname`: (string) name of the `map` to modify
    - `diagonals`: (boolean) *(optional)* new diagonal movement state
    - `columns`: (number) *(optional)* new column count, must form a rectangular grid with `maparray`
    - `maparray`: (array&lt;string&gt;) *(optional)* new logic grid array, must form a rectangular grid with `columns`
    - `mapview`: (object) *(optional)* new `mapview` configuration
        - `mapview.columns`: (number) *(optional)* new column count, must form a rectangular grid with `mapview.array`
        - `mapview.array`: (array&lt;string&gt;) *(optional)* new `mapview` array, must form a rectangular grid with `mapview.columns`
- **Examples:**
    ```js
    Sleepymap.set_map({
        mapname   : 'node_house',
        diagonals : true,
    });
    ```


<h3 id='javascript-edit_exits'><code>edit_exits</code></h3>

Manually creates or removes an exit between two `mapnodes` or grid coordinates. Using `from/to` on a `grid travel` map will not throw an error, but it will be non-functional — and vice versa. This method does *not* automatically add or remove the reciprocal exit from the provided inputs and can create one-way exits. 

The `<<connect_map>>` and `<<disconnect_map>>` macros are both wrappers for this method — the only difference is that `<<disconnect_map>>` has the `removing` argument set to `true`.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `dir`: (string) the direction of the connection ("N", "E", "S", "W", "NE", "SE", "SW", "NW"); must be provided when adding a connection; if undefined when removing, connections between the origin and target will be removed in *all* directions
    - `from`/`to`: (string) (`node travel`) `mapnode` id to connect from/to 
    - `from_x`/`from_y`/`to_x`/`to_y`: (number) (`grid travel`) origin/target x/y coordinates
    - `removing`: (boolean) *(optional)* `true` to remove an existing connection, `false` to create one, default `false`
- **Examples:**
    ```js
    /* connect the stairs */
    Sleepymap.edit_exits({
        mapname : 'grid_house',
        from_x  : 8,
        from_y  : 4,
        to_x    : 14,
        to_y    : 5,
        dir     : 'N',
    });
    Sleepymap.edit_exits({
        mapname : 'grid_house',
        from_x  : 14,
        from_y  : 5,
        to_x    : 8,
        to_y    : 4,
        dir     : 'S',
    });

    /* master bedroom can be entered but not left */
    Sleepymap.edit_exits({
        mapname  : 'node_house',
        from     : 'M',
        to       : 'H',
        removing : true,
    });
    ```


<h3 id='javascript-get_mapnode'><code>get_mapnode</code></h3>

Retrieves the current metadata for a specific `mapnode`.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `mapnode`: (string) id of the `mapnode` to retrieve
- **Returns:** A cloned object containing the `mapnode`'s properties.
- **Examples:**
    ```js
    // get the current metadata for the pantry
    const pantryData = Sleepymap.get_mapnode({
        mapname : 'node_house',
        mapnode : 'P'
    });
    ```


<h3 id='javascript-set_mapnode'><code>set_mapnode</code></h3>

Updates the metadata for a specific `mapnode` in an existing `map`. Incomplete objects are accepted, and only the provided properties will be updated. `mapnode` ids are immutable. 

The `<<set_mapnode>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `mapnode`: (string) id of the `mapnode` to modify
    - `data`: (object) Object containing properties to update
        - `name`: (string) *(optional)* new name for the `mapnode`
        - `tile`: (HTML string) *(optional)* new tile for the `mapnode`
        - `disabled`: (boolean) *(optional)* whether the `mapnode` is disabled on `interfaces`
        - `hidden`: (boolean) *(optional)* whether the `mapnode` is hidden on `interfaces` with opacity zero
        - `blocked`: (boolean) *(optional)* whether the `mapnode` causes `mapmoves` through it to fail
        - `walled`: (boolean) *(optional)* whether the `mapnode` is a wall
- **Examples:**
    ```js
    // lock the pantry
    Sleepymap.set_mapnode({
        mapname : 'node_house',
        mapnode : 'P',
        data    : { name: 'Locked Pantry', blocked: true }
    });
    ```


<h3 id='javascript-get_mapstate'><code>get_mapstate</code></h3>

Retrieves the current state of a specific map property. If no `mapstate` is supplied, it is assumed to be `"position"`

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `mapstate`: (string) *(optional)* the property to retrieve (`"position"`, `"frozen"`, `"disabled"`, `"hidden"`, `"blocked"`, or `"walled"`)
- **Returns:** The current value of the requested property.
- **Examples:**
    ```js
    // get the current position
    const position = Sleepymap.get_mapstate({
        mapname : 'node_house',
    });

    // get an object which tells which mapnodes are hidden
    const hidden_nodes = Sleepymap.get_mapstate({
        mapname  : 'node_house',
        mapstate : 'hidden',
    });
    ```
    
    
<h3 id='javascript-set_mapstate'><code>set_mapstate</code></h3>

Updates the operational state of a map, including player position or toggling `disabled`, `hidden`, `blocked`, and `walled` properties for multiple `mapnodes` simultaneously. 

The `<<set_mapstate>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `position`: (object) *(optional)* new position
        - `mapnode`: (string) id of node (`node travel`)
        - `x`/`y`: (number) x/y coordinate (`grid travel`)
    - `frozen`: (boolean) *(optional)* disables all interface interactions
    - `disabled`, `hidden`, `blocked`, `walled`: (object) *(optional)* Maps of `mapnode` ids to boolean values.
- **Examples:**
    ```js
    // reposition player without triggering any scripts or events
    Sleepymap.set_mapstate({
        mapname  : 'grid_house',
        position : { x: 10, y: 5 },
    });

    // unlock pantry, hide both bedrooms
    Sleepymap.set_mapstate({
        mapname : 'node_house',
        blocked : { 'P': false },
        hidden  : { 'M': true, 'G': true }
    });
    ```


<h2 id='javascript-interface'>Interface Items</h2>


<h3 id='javascript-create_rose'><code>create_rose</code></h3>

Creates a jQuery `rose` element, which provides a 3x3 grid of `exits` from the current position in each direction. 

The `<<place_rose>>` macro calls this method and appends the result to the macro output.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `background`: (HTML string) *(optional)* inserted as a background element
    - `enabled`: (boolean\|TwineScript string) *(optional)* whether the `rose` is enabled, by default will check the `map`'s `frozen` value
    - `autoupdate`: (boolean) *(optional)* whether the `rose` automatically updates, default set in `options`
    - `clickable` : (boolean) *(optional)* whether the `exits` are navigation links, default set in `options`
- **Returns:** (jQuery object) the created `$rose` element
- **Examples:**
    ```js
    // returns a $rose jQuery element that doesn't autoupdate
    Sleepymap.create_rose({
        mapname    : 'node_house',
        background : '<img src="./assets/small_house.png">',
        autoupdate : false
    });
    ```


<h3 id='javascript-create_mapview'><code>create_mapview</code></h3>

Creates a jQuery `mapview` element, providing a visual representation of the map using the `maparray`.  Options include clickable tiles, `mapnode` labels, path highlighting (`grid travel` only), and quick moving to distant tiles (`grid travel` only).

The `<<place_mapview>>` macro calls this method and appends the result to the macro output. 

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `background`: (HTML string) *(optional)* inserted as a background element
    - `enabled`: (boolean\|TwineScript string) *(optional)* whether the `mapview` is enabled, by default will check the `map`'s `frozen` value
    - `autoupdate`: (boolean) *(optional)* whether the `mapview` automatically updates, default set in `options`
    - `clickable`: (boolean) *(optional)* whether nodes can be clicked to navigate, default set in `options`
    - `show_labels`: (boolean) *(optional)* whether to display labels (names or directional icons) for each node, default set in `options`
    - `pathing`: (boolean) *(optional)* whether to highlight the path to the hovered tile; highlighted path is generated by adding the `.macro-Sleepymap-path` class to each `tile` along the path; default set in `options`
    - `quickmove`: (boolean) *(optional)* whether clicking a distant traversable tile initiates multiple sequential `mapmoves`; `clickable` *must* be `true` for `quickmove` to function; default set in `options`
- **Returns:** (jQuery object) the created `$mapview` element
- **Examples:**
    ```js
    // places a mapview that has quickmove disabled but pathing enabled
    Sleepymap.create_mapview({
        mapname    : 'grid_house',
        pathing    : true,
        quickmove  : false,
        background : '<img src="./assets/small_house.png">',
    });
    ```


<h3 id='javascript-create_controller'><code>create_controller</code></h3>

Creates a controller that controls a listener for keyboard input to trigger `mapmove` events. Removing the controller deletes the listener. Every provided property must match for the `mapmove` to trigger — which means the `controller` only triggers `mapmove` to adjacent `exits` when a `dir` is provided, and teleports when a `dir` is not provided.

The `<<place_controller>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `enabled`: (boolean\|TwineScript string) *(optional)* whether the `controller` is enabled, by default will check the `map`'s `frozen` value
    - `keys`: (object) map of key codes to target movement objects
        - `[key]`: (string) `keyup` event `key` value
            - `dir`: (string) *(optional)* directional exit to follow ("N", "E", "S", "W", "NE", "SE", "SW", "NW")
            - `mapnode`: (string) *(optional)* target `mapnode` ID
            - `x`/`y`: (number) *(optional)* target x/y coordinate
- **Examples:**
    ```js
    // set up wasd control for movement to adjacent spaces
    Sleepymap.create_controller({
        mapname : 'grid_house',
        keys    : {
            w   : { dir: 'N' },
            d   : { dir: 'E' },
            s   : { dir: 'S' },
            a   : { dir: 'W' },
        }
    });
    ```
    
    
<h3 id='javascript-update_interface'><code>update_interface</code></h3>

Manually triggers an update for an `interface` element. One of either `$interface` or `selector` *must* be provided; if both are provided `selector` will be ignored. This is useful if the author has manually modified `interface` items or has disabled autoupdate. 

The `<<update_interface>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `selector`: (string) jQuery selector string used to find the interface element if `$interface` is not provided
    - `$interface`: (jQuery object) the specific `$rose` or `$mapview` element to refresh
        - aliases: `interface`, `$rose`, `$mapview`
- **Examples:**
    ```js
    Sleepymap.update_interface({
        $interface: $('#rose-element'),
    });
    ```


<h2 id='javascript-movement'>Movement & Entities</h2>


<h3 id='javascript-begin_mapmove'><code>begin_mapmove</code></h3>

Begins the `mapmove` procedure and fires the `Sleepymap:mapmove_began` event. This method does not check against automatically generated exits and will *teleport* the player regardless of distance or any `blocked` or `walled` mapnodes inbetween — but will fail if the destination is `blocked` or `walled`. `mapscripts` trigger as normal.

`target_mapnode`, `target_x`/`target_y` can both be used in either `node travel` or `grid travel` modes.  `node travel` will fetch the `mapnode` at the targeted x/y coordinate, and `grid travel` will fetch the first x/y coordinate with the targeted `mapnode`.

The `<<mapmove>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `target_mapnode`: (string) *(optional)* ID of the `mapnode` to move to (`node travel`)
    - `target_x`: (number) *(optional)* target x coordinate (`grid travel`)
    - `target_y`: (number) *(optional)* target y coordinate (`grid travel`)
    - `force_abort`: (boolean) *(optional)* `true` to force the move to fail, default `false`
    - `skip_scripts`: (boolean) *(optional)* `true` to bypass `mapscripts` for this move, default `false`
- **Examples:**
    ```js
    // teleport to the master bedroom
    Sleepymap.begin_mapmove({
        mapname        : 'node_house',
        target_mapnode : 'M',
    });

    // teleport to first grid cell of dining room
    Sleepymap.begin_mapmove({
        mapname        : 'grid_house',
        target_mapnode : 'D',
    });
    ```


<h3 id='javascript-find_path'><code>find_path</code></h3>

Calculates the shortest path between two points on a `grid travel` map using a Breadth-First Search (BFS) algorithm. `node travel` maps aren't supported and will always return `null`.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `from_i`: (number) *(optional)* starting index in the `maparray`
    - `to_i`: (number) *(optional)* target index in the `maparray`
    - `from_x` / `from_y`: (number) *(optional)* starting coordinates
    - `to_x` / `to_y`: (number) *(optional)* target coordinates
    - `stopped_by_disabled`: (boolean) *(optional)* whether disabled nodes stop pathing, default set in `options`
    - `stopped_by_hidden`: (boolean) *(optional)* whether hidden nodes stop pathing, default set in `options`
    - `stopped_by_blocked`: (boolean) *(optional)* whether blocked nodes stop pathing, default set in `options`
- **Returns:** An array of indices (if `from_i`/`to_i` used) or coordinate objects (if `from_x`/`from_y`/`to_x`/`to_y` used) representing the path, or `null` if no path is found.
- **Examples:**
    ```js
    // find path using indices
    const path = Sleepymap.find_path({
        mapname : 'grid_house',
        from_i  : 5,
        to_i    : 20
    });
    ```


<h3 id='javascript-set_mapscripts'><code>set_mapscripts</code></h3>

Assigns TwineScript logic to run during the `mapmove` process. Both `node travel` and `grid travel` can use any combination of `from`/`to`/`from_x`/`from_y`/`to_x`/`to_y`.  If multiple arguments are set, *all* must be true for the `mapscript` to fire. The `"any"` keyword can be used to signal that any value will trigger the `mapscript` (which does the same thing as not setting the argument at all). 

The `<<set_mapscripts>>` macro is a wrapper for this method.

Scripts of the same type will triggered by their position in the `scripts` array — but `onmapattempt` scripts always trigger first, then:
    - `onmapstart` scripts followed by `onmapend` scripts if the `mapmove` succeeded
    - `onmapabort` scripts if it failed.

**Note:** Calling this on a `map` that already has `mapscripts` set will ***overwrite*** existing `mapscripts`!

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `scripts`: (array&lt;object&gt;) array of script objects, each containing:
        - `type`: (`"onmapattempt"`\|`"onmapstart"`\|`"onmapend"`\|`"onmapabort"`) the script trigger
        - `contents`: (TwineScript string) the TwineScript code to execute
        - `triggers`: (object) *(optional)* conditional triggers, scripts will *always* run if left undefined
            - `from`/`to`: (string\|array&lt;string&gt;\|"any") *(optional)* id(s) of the node the player is moving from/to
            - `from_x`/`from_y`/`to_x`/`to_y`: (number\|array&lt;number&gt;\|"any") *(optional)* origin/target x/y coordinates
- **Examples:**
    ```js
    Sleepymap.set_mapscripts({
        mapname: 'node_house',
        scripts: [
            // decrement energy whenever a mapmove is attempted
            {
                type     : 'onmapattempt',
                contents : '<<set $energy-->>',
            },
            // increase heat when moving around upstairs
            {
                type     : 'onmapattempt',
                contents : '<<set $heat++>>',
                triggers : {
                    to   : ['L', 'H', 'G', 'M'],
                },
            },
            // ring a bell when coming down the stairs
            {
                type     : 'onmapstart',
                contents : '<<run console.log("Ding!")>>',
                triggers : {
                    from : 'S',
                    to   : 'D',
                },
            },
            // increase hunger when entering the kitchen or pantry
            {
                type     : 'onmapend',
                contents : '<<set $hunger++>>',
                triggers : {
                    from : 'D',
                    to   : ['K', 'P'],
                },
            },
            // tell <<redo>> to run any time mapmove succeeds
            {
                type     : 'onmapend',
                contents : '<<redo>>',
            },
        ]
    });
    ```


<h3 id='javascript-set_entity'><code>set_entity</code></h3>

Creates, updates, or removes an entity on the map. 

The `<<new_entity>>`, `<<set_entity>>`, and `<<delete_entity>>` macros are all wrappers for this method. `<<delete_entity>>` has `removing` set to true. `<<new_entity>>` and `<<set_entity>>` are identical.

- **argObj Properties:**
    - `mapname`: (string) name of the `map`
    - `entityname`: (string) unique identifier for the entity
    - `x`/`y`: (number) x/y coordinate
    - `tile`: (HTML string) *(optional)* display tile for the entity
    - `removing`: (boolean) *(optional)* `true` to delete the entity, default `false`
- **Examples:**
    ```js
    // place a kitty in the dining room
    Sleepymap.set_entity({
        mapname    : 'node_house',
        entityname : 'kitty',
        x          : 7,
        y          : 5,
        tile       : '🐱',
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

<h1 id='events'>Events</h1>

`Sleepymap` fires several events that allow for manipulating player movement and tracking map changes. All `Sleepymap` events fire off `#passages` and resolve on `document`.


<h3 id='events-mapmove_began'><code>Sleepymap:mapmove_began</code></h3>

Triggered when any `mapmove` attempt begins immediately after `onmapattempt` scripts fire, and can be intercepted to manipulate the `mapmove`.

- **Event Data:**
    - `mapname`: (string) name of the `map` triggering the `mapmove`
    - `origins`: (object) origin location details
        - `mapnode`: (string)
        - `xys`: (array&lt;object&gt;)
            - `x`/`y`: (number) x/y coordinates
        - `entities`: (array&lt;object&gt;)
            - `name`: (string) entity's name
            - `x`/`y`: (number) entity's x/y coordinates
            - `tile`: (HTML string) entity's tile
    - `targets`: (object) target location details
        - `mapnode`: (string)
        - `xys`: (array&lt;object&gt;)
            - `x`/`y`: (number) x/y coordinates
        - `entities`: (array&lt;object&gt;)
            - `name`: (string) entity's name
            - `x`/`y`: (number) entity's x/y coordinates
            - `tile`: (HTML string) entity's tile

    - `force_abort`: (boolean) whether the `mapmove` is being forced to fail


<h3 id='events-mapmove_resolved'><code>Sleepymap:mapmove_resolved</code></h3>

Triggered after any `mapmove` resolves.

- **Event Data:**
    - `mapname`: (string) name of the `map` that triggered the `mapmove`
    - `origins`: (object) origin location details
        - `mapnode`: (string)
        - `xys`: (array&lt;object&gt;) array of coordinates being targeted
            - `x`/`y`: (number) x/y coordinates
        - `entities`: (array&lt;object&gt;)
            - `name`: (string) entity's name
            - `x`/`y`: (number) entity's x/y coordinates
            - `tile`: (HTML string) entity's tile
    - `targets`: (object) target location details
        - `mapnode`: (string)
        - `xys`: (array&lt;object&gt;) array of coordinates being targeted
            - `x`/`y`: (number) x/y coordinates
        - `entities`: (array&lt;object&gt;)
            - `name`: (string) entity's name
            - `x`/`y`: (number) entity's x/y coordinates
            - `tile`: (HTML string) entity's tile
    - `succeeded`: (boolean) whether the movement was successful

<h3 id='events-map_edited'><code>Sleepymap:map_edited</code></h3>

Triggered after modifications to the map (i.e., `set_map`, `edit_exits`, `set_mapnode`, `set_mapstate`, `set_entity`). Useful for performing custom UI updates.

- **Event Data:**
    - `mapname`: (string) name of the `map` that was modified


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

<h1 id='options'>Options</h1>

- `setup['@Sleepymap/options']`
    - `default`
        - `diagonals`: (boolean) whether diagonal movement is allowed (value: `false`)
        - `autoupdate_rose`: (boolean) whether the `rose` automatically updates (value: `true`)
        - `clickable_rose`: (boolean) whether the `rose` is clickable (value: `true`)
        - `autoupdate_mapview`: (boolean) whether the `mapview` automatically updates (value: `true`)
        - `clickable_mapview`: (boolean) whether the `mapview` is clickable (value: `true`)
        - `show_labels_on_mapview`: (boolean) whether the `mapview` shows labels for mapnodes (value: `true`)
        - `pathing_on_mapview`: (boolean) whether pathing is enabled on the `mapview` (value: `true`)
        - `quickmove_on_mapview`: (boolean) whether quickmoving is enabled on the `mapview` (value: `true`)
        - `pathmove_delay`: (number) delay in milliseconds between steps in a pathmove (value: `250`)
        - `disabled_stops_pathing`: (boolean) whether disabled nodes stop pathfinding (value: `true`)
        - `hidden_stops_pathing`: (boolean) whether hidden nodes stop pathfinding (value: `true`)
        - `blocked_stops_pathing`: (boolean) whether blocked nodes stop pathfinding (value: `false`)
    - `wall_id`: (string) default id used to represent walls in the map grid (value: `.`)
    - `labels`: (object) directional arrow symbols used in `grid_travel` mode
        - `N`/`E`/`S`/`W`/`NE`/`SE`/`SW`/`NW`: (string) printed text used a label (value: `<svg class='macro-Sleepymap-arrow' viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2L4 12h5v10h6V12h5L12 2z" transform="rotate(${deg} 12 12)"/></svg>`, where `${deg}` is the rotation dependding on the direction)
    - `map_storage_story_variable`: (string) SugarCube story variable where map data is stored (value: `'@Sleepymap/maps'`) (**edit at your own risk**)
    - `maparray_splitter`: (regex) regular expression used to split the `maparray` provided in `<<new_map>>` (value: `/\s+/g`) (**edit at your own risk**)
    - `barriers`: (object) regular expressions used to detect barriers from the raw `maparray` index in `new_map` or `<<new_map>>` (**edit at your own risk**)
        - `N`: (regex) used to identify north barriers (value: `/"/`)
        - `E`: (regex) used to identify east barriers (value: `/(?<=[a-zA-Z0-9][^\s]*)\|(?![a-zA-Z0-9])/`)
        - `S`: (regex) used to identify south barriers (value: `/_/`)
        - `W`: (regex) used to identify west barriers (value: `/(?<![a-zA-Z0-9])\|(?=[^\s]*[a-zA-Z0-9])/`)
        - `NE`: (regex) used to identify northeast barriers (value: `/(?<=[a-zA-Z0-9][^\s]*)\\(?![a-zA-Z0-9])/`)
        - `SE`: (regex) used to identify southeast barriers (value: `/(?<=[a-zA-Z0-9][^\s]*)\/(?![a-zA-Z0-9])/`)
        - `SW`: (regex) used to identify southwest barriers (value: `/(?<![a-zA-Z0-9])\\(?=[^\s]*[a-zA-Z0-9])/`)
        - `NW`: (regex) used to identify northwest barriers (value: `/(?<![a-zA-Z0-9])\/(?=[^\s]*[a-zA-Z0-9])/`)
        - `replace`: (regex) final regex that cleanses all special characters to get the `mapnode` id (value: `/[\/\\|_"]/g`)


<p align="center">
    &bull; &bull; &bull;
</p>


<!--
 ████   ███  ████  █   █     █    █  ████  ████  █████
 █   █ █   █ █   █ █  █      ██  ██ █    █ █   █ █
 █   █ █████ ████  ███       █ ██ █ █    █ █   █ ███
 █   █ █   █ █   █ █  █      █    █ █    █ █   █ █
 ████  █   █ █   █ █   █     █    █  ████  ████  █████
 SECTION: dark mode
-->
<button id='dark-toggle' aria-label='Toggle dark mode'>☀︎</button>
<script>
(function () {
    const btn = document.getElementById('dark-toggle');
    const key = 'Sleepymap-dark'; // class to toggle
    // apply dark mode based on saved preference
    function set_mode(dark) {
        document.documentElement.classList.toggle('dark', dark);
        btn.textContent = dark ? '☀︎' : '☾';
    }
    set_mode(localStorage.getItem(key) === '1');
    btn.addEventListener('click', function () {
        const dark = ! document.documentElement.classList.contains('dark');
        localStorage.setItem(key, dark ? '1' : '0');
        set_mode(dark);
    });
})();
</script>


</section>