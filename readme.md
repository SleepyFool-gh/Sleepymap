<!--
 ███ █    █ █████ ████   ████
  █  ██   █   █   █   █ █    █
  █  █ █  █   █   ████  █    █
  █  █  █ █   █   █   █ █    █
 ███ █   ██   █   █   █  ████
 SECTION: intro
-->

# `Areamap` Library

`Areamap` is a map library for SugarCube designed for room-to-room movement like **Darkest Dungeon** or node-to-node movement like **Faster Than Light** — NOT for grid movement like **Zelda** or **Final Fantasy Tactics**.

`Areamap` takes a space-separated 2D text grid and converts it into a functional map for player navigation (`mapmove`). All grid spaces with the same `maparea` id will be treated as one big room, regardless of how many grid spaces it occupies or whether it is continuous.

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

&nbsp;




<!--
 █    █  ███   ████ ████   ████   ████
 ██  ██ █   █ █     █   █ █    █ █
 █ ██ █ █████ █     ████  █    █  ███
 █    █ █   █ █     █   █ █    █     █
 █    █ █   █  ████ █   █  ████  ████
 SECTION: macros
-->

## Macros:

### `<<new_areamap>>`
Defines a new `areamap`. This macro **must** be called in `StoryInit`. It accepts a 2D grid layout via its contents and supports optional child tags for advanced configuration.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `columns`: (number) # of columns in the logic representation grid
    - `diagonals`: (boolean) *(optional)* whether diagonal movement is allowed
- **Contents:** 
    * 2D space-separated text grid representing map logic, must be rectangular.
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

&nbsp;

### `<<place_arearose>>`
Generates a 3x3 grid of directional links for navigation.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `rose` automatically updates after each `mapmove` or when the areamap changes, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element for the `rose`

&nbsp;

### `<<update_arearose>>`
Manually updates a `rose` element.

- **Arguments:** 
    - `rose`: (selector string) jQuery selector for the `rose` element to update

&nbsp;

### `<<place_mapview>>`
Renders a visual representation of the `areamap` with the tiles configured in the `<<mapareas>>` child tag of `<<new_areamap>>`, using the 2D grid defined in the `<<mapview>>` child tag of `<<new_areamap>>`. If no `<<mapview>>` was used, the 2D logic map is used. Can optionally be made clickable for navigation or to display maparea names.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `mapview` automatically updates after each `mapmove` or when the `areamap` changes, default set in `options`
    - `clickable`: (boolean) *(optional)* whether mapareas can be clicked to navigate, default set in `options`
    - `show_names`: (boolean) *(optional)* whether to display names for each `maparea`, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element for the `mapview`

&nbsp;

### `<<update_mapview>>`
Manually updates a `mapview` element.

- **Arguments:** 
    - `mapview`: (selector string) jQuery selector for the `mapview` element to update

&nbsp;

### `<<set_areascripts>>`
Assigns TwineScript logic to run during the `mapmove` process. Arguments can be used to control which `mapareas` trigger the scripts. This macro **must** be called in `StoryInit`. Child tag order is preserved, but `<<onmapattempt>>` tags always run first, followed by:
    - when `mapmove` succeeds: `<<onmapstart>>` then `<<onmapend>>`
    - when `mapmove` fails: `<<onmapabort>>`

- **Child Tags:**
    - `<<onmapattempt>>`: Always runs, immediately when a mapmove is attempted
    - `<<onmapstart>>`: Only runs when `mapmove` succeeds, before position is updated
    - `<<onmapend>>`: Only runs when mapmove succeeds, after position is updated
    - `<<onmapabort>>`: Only runs when mapmove fails
    - **Arguments:** All these child tags take the same arguments
        - `to`: (string|array<string>|"any") *(optional)* id(s) of the `maparea` the player is moving to; either as a string, an array of strings, or "any"
        - `from`: (string|array<string>|"any") *(optional)* id(s) of the `maparea` the player is moving from; either as a string, an array of strings, or "any"

&nbsp;

### `<<areamapmove>>`
Manually triggers a `mapmove` attempt. Using this macro circumvents any checks that the target `maparea` is a neighboring `maparea`, allowing for more flexible navigation — but `blocked` will still apply and cause the `mapmove` to fail.

- **Arguments:** 
    - `mapname`: (string) name of `areamap`
    - `target`: (string) `maparea` to move to
    - `force_abort`: (boolean) *(optional)* `true` forces the `mapmove` to fail, default `false`

&nbsp;




<!--
 █    █ █████ █████ █   █  ████  ████   ████
 ██  ██ █       █   █   █ █    █ █   █ █
 █ ██ █ ███     █   █████ █    █ █   █  ███
 █    █ █       █   █   █ █    █ █   █     █
 █    █ █████   █   █   █  ████  ████  ████
 SECTION: methods
-->

## JavaScript Methods:

Javascript methods are stored on the `Areamap` window object. All methods take an `argObj` argument object.

### `new_areamap`
Creates a new `areamap`. The `<<new_areamap>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of `areamap`
    - `columns`: (number) number of columns in the map grid
    - `maparray`: (array<string>) 1D array of `maparea` ids representing the map navigation logic, length must be divisible by `columns`
    - `diagonals`: (boolean) *(optional)* whether diagonal movement is allowed, default set in `options`
    - `mapview`: (object) *(optional)* data defining a separate grid for the mapview
        - `mapview.columns`: (number) number of columns in the `mapview` grid
        - `mapview.array`: (array<string>) 1D array of `maparea` ids representing the mapview navigation logic, length must be divisible by `mapview.columns`
    - `mapareas`: (object) *(optional)* additional metadata for `mapareas`, partial objects will be filled with default values
        - `mapareas.name`: (string) *(optional)* used for links in `roses` & for the `show_names` option in `mapviews`, default is the `maparea` id
        - `mapareas.type`: ("floor"|"wall") *(optional)* `floors` can be occupied by a player, `walls` can't and block movement; default `"floor"`
        - `mapareas.tile`: (HTML string) *(optional)* inserted into each space in the `mapview`
    - `mapvars`: (object) *(optional)* data defining links to `story variables`, `position` will update automatically when `mapmove` succeeds — these must all be `story variables` names starting with `$`
        - `mapvars.position`: (string) stores current `areamap` position, as a string
        - `mapvars.disabled`: (string) *(optional)* stores whether `rose` and `mapview` links to each `maparea` are shown but disabled, as an object of booleans
        - `mapvars.hidden`: (string) *(optional)* stores whether `rose` and `mapview` links to each `mapareea` should be hidden, as an object of booleans
        - `mapvars.blocked`: (string) *(optional)* stores whether `mapmove` to each `maparea` should fail, as an object of booleans
        - `mapvars.frozen`: (string) *(optional)* stores whether ALL `rose` and `mapview` links for an `areamap` are `disabled`, as a boolean

&nbsp;

### `create_rose`
Creates a jQuery `rose` element. The `<<place_arearose>>` macro calls this method and appends the result to the macro output.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `rose` automatically updates, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element

&nbsp;

### `update_rose`
Manually updates `rose` elements in the DOM. If the jQuery object passed to this method references multiple `roses`, all of them will update. Non-`rose` elements will be ignored. The `<<update_arearose>>` macro is a wrapper for this method. 

- **argObj Properties:**
    - `rose`: (jQuery object) the specific `$rose` element to refresh

&nbsp;

### `create_mapview`
Creates a jQuery `mapview` element. The `<<place_mapview>>` macro calls this method and appends the result to the macro output.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `autoupdate`: (boolean) *(optional)* whether the `mapview` automatically updates, default set in `options`
    - `clickable`: (boolean) *(optional)* whether `mapareas` can be clicked to navigate, default set in `options`
    - `show_names`: (boolean) *(optional)* whether to display names for each `maparea`, default set in `options`
    - `background`: (HTML string) *(optional)* inserted as a background element

&nbsp;

### `update_mapview`
Manually updates `mapview` elements in the DOM. If the jQuery object passed to this method references multiple `mapviews`, all of them will update. Non-`mapview` elements will be ignored. The `<<update_mapview>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapview`: (jQuery object) the specific `$mapview` element to refresh

&nbsp;

### `set_areascripts`
Assigns `TwineScript` logic to run during the `mapmove` process. The `<<set_areascripts>>` macro is a wrapper for this method. The four script types supported by this method are:
    - `onmapattempt`: always fire, immediately before `mapmove` pass/fail is determined
    - `onmapstart`: fires if `mapmove` succeeds, immediately before the player's location is updated
    - `onmapend`: fires if `mapmove` succeeds, immediately after the player's location is updated
    - `onmapabort`: fires if `mapmove` fails

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `scripts`: (array<object>) an array of script objects to assign to the map, each object ha
        - `type`: (`"onmapattempt"`|`"onmapstart"`|`"onmapend"`|`"onmapabort"`) the event trigger
        - `contents`: (string) the `TwineScript` code to execute
        - `areas`: (object)
            - `areas.to`: (string|array<string>|"any") *(optional)* id(s) of the `maparea` the player is moving to
            - `areas.from`: (string|array<string>|"any") *(optional)* id(s) of the `maparea` the player is moving from

&nbsp;

### `begin_mapmove`
Begins the `mapmove` procedure and fires the `areamap:mapmove_began` event. The `<<areamapmove>>` macro is a wrapper for this method.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap`
    - `id_target`: (string) the `maparea` id to move to
    - `force_abort`: (boolean) *(optional)* `true` forces the `mapmove` to fail, default `false`

&nbsp;

### `get_map`
Retrieves a copy of a map object.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap` to retrieve
- **Returns:** An object containing the map's structure, including `mapname`, `columns`, `maparray`, `diagonals`, `mapview`, `mapareas`, `mapvars`, `exits`, and `scripts`.

&nbsp;

### `edit_map`
Allows for dynamic modification of an existing `areamap`. This method will automatically update the `areamap`'s navigation logic and update any `roses` or `mapviews` set to autoupdate.

- **argObj Properties:**
    - `mapname`: (string) name of the `areamap` to modify
    - `diagonals`: (boolean) *(optional)* new diagonal movement state
    - `columns`: (number) *(optional)* new column count, must form a rectangular grid with `maparray`
    - `maparray`: (array<string>) *(optional)* new logic grid array, must form a rectangular grid with `columns`
    - `mapview`: (object) *(optional)* new `mapview` configuration
        - `mapview.columns`: (number) *(optional)* new column count, must form a rectangular grid with `mapview.array`
        - `mapview.array`: (array<string>) *(optional)* new `mapview` array, must form a rectangular grid with `mapview.columns`
    - `mapareas`: (object) *(optional)* update metadata for one or more `mapareas`, incomplete objects will retain existing values for missing data
        - `mapareas.[id]`: (object)
            - `mapareas.[id].name`: (string) *(optional)* new name
            - `mapareas.[id].type`: ("floor"|"wall") *(optional)* new maparea type
            - `mapareas.[id].tile`: (HTML string) *(optional)* new HTML string to display in `maparea`

&nbsp;



<!--
 █████ █   █ █████ █    █ █████  ████
 █     █   █ █     ██   █   █   █
 ███   █   █ ███   █ █  █   █    ███
 █      █ █  █     █  █ █   █       █
 █████   █   █████ █   ██   █   ████
 SECTION: events
-->

## Events:

`Areamap` fires several events that allow for manipulating player movement and tracking map changes. All `Areamap` events fire off `#passages` and resolve on `document`. Authors that intend to intercept `Areamap` events should place their listeners on `#story`.

### `areamap:mapmove_began`
Triggered immediately when any `mapmove` attempt begins

  - **Event Data:**
    - `mapname`: (string) name of the `areamap` triggering the `mapmove`
    - `id_origin`: (string) id of `maparea` the player is moving from
    - `id_target`: (string) id of `maparea` the player is moving to
    - `force_abort`: (boolean) true forces the `mapmove` to fail

&nbsp;

### `areamap:mapmove_resolved`
Triggered after any `mapmove` resolves

- **Event Data:**
    - `mapname`: (string) name of the `areamap` that triggered the `mapmove`
    - `id_origin`: (string) the `maparea` ID the player moved from
    - `id_target`: (string) the `maparea` ID the player moved to
    - `succeeded`: (boolean) whether the movement was successful

&nbsp;

### `areamap:map_edited`
Triggered after the `edit_map` method completes, useful if you need to perform additional UI updates not covered by the standard `autoupdate` functionality.

- **Event Data:**
    - `mapname`: (string) name of the `areamap` that was modified

&nbsp;




<!--
  ████  ████  █████ ███  ████  █    █  ████
 █    █ █   █   █    █  █    █ ██   █ █
 █    █ ████    █    █  █    █ █ █  █  ███
 █    █ █       █    █  █    █ █  █ █     █
  ████  █       █   ███  ████  █   ██ ████
 SECTION: options
-->

## Options:

- All options can be overridden by passing them as arguments to their respective macros.

- `setup['@areamap/options'].default.wall_id`: (string) default id used to represent walls in the map grid, default `.`
- `setup['@areamap/options'].default.diagonals`: (boolean) whether diagonal movement is allowed, default `false`
- `setup['@areamap/options'].default.autoupdate_rose`: (boolean) whether to automatically update the `rose`, default `true`
- `setup['@areamap/options'].default.autoupdate_mapview`: (boolean) whether to automatically update the `mapview`, default `true`
- `setup['@areamap/options'].default.clickable_mapview`: (boolean) whether the `mapview` is clickable, default `true`
- `setup['@areamap/options'].default.show_names_on_mapview`: (boolean) whether the `mapview` shows names for the `mapareas`, default `false`