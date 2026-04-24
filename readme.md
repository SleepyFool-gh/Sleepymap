# `Areamap` Library

Map library for SugarCube for moving between areas. This library is for room-to-room movement like **Darkest Dungeon** or node-to-node movement like **Faster Than Light** — NOT for grid movement like **Zelda** or **Final Fantasy Tactics**.

&nbsp;

### Default behavior:
`Areamap` takes a space-separated 2D text grid and converts it into a functional map that a player can navigate through. All grid spaces with the same ID will be treated as one big room, regardless of how many spaces it occupies or whether it is continuous.

This library includes two built-in options for navigation:
1) a compass rose with directional buttons (rose)
2) a visual map with (optionally) clickable rooms (mapview)

   but also includes methods to build your own interface items

#### Features:
*   Scripts can be assigned to run at various stages of the movement process.
*   The 2D grid used to generate the mapview can be different from the 2D grid used for map logic.
*   Diagonal movement can be enabled / disabled.
*   Movement links can be hidden (links hidden), disabled (links disabled, `mapmove` prevented), or blocked (links available, `mapmove` attempted but fails).
*   JavaScript methods for manipulating areamaps, roses, and mapviews
*   Configurable defaults for various settings

&nbsp;

### Macros:

### `<<new_areamap>>`
Used to define a new areamap. This macro **must** be called during `StoryInit`. It accepts a 2D grid layout via its contents and supports optional child tags for advanced configuration.

*   **Arguments:** `mapname` (string, required), `columns` (number, required), `diagonals` (boolean, optional).
*   **Contents:** 2D space-separated text representation of areamap logic, must be rectangular.
*   **Child Tags:**
    *   `<<mapview>>`: Defines a different 2D grid to use for mapview instead of the map logic grid
        *   **Arguments:** `columns` (number, required)
        *   **Contents:** 2D space-separated text representation of mapview, must be rectangular.
    *   `<<mapvars>>`: Links map state to various story variables for map behavior manipulation. `position` will update automatically when `mapmove` succeeds.
        *   **Arguments:** 
            *   `position`: (string, story variable name, required) stores current areamap position, as a string
            *   `frozen`: (string, story variable name, optional) stores whether ALL links are disabled, as a boolean
            *   `disabled`: (string, story variable name, optional) stores disabled state of each maparea, as an object of booleans
            *   `hidden`: (string, story variable name, optional) stores hidden state of each maparea, as an object of booleans
            *   `blocked`: (string, story variable name, optional) stores blocked state of each maparea, as an object of booleans
    *   `<<mapareas>>`: Defines maparea metadata for each map ID.
        *   **Arguments:**
            *   `name`: (string, optional) used for links
            *   `type`: (string, optional) used for determining navigation behavior, anything not "wall" will be treated as "floor"
            *   `tile`: (HTML string, optional) used for the mapview display

&nbsp;

### `<<place_areamap_rose>>`
Generates a 3x3 grid of directional links for navigation.

*   **Arguments:** 
    *   `mapname`: (string, required) map identifier
    *   `autoupdate`: (boolean, optional) whether the rose automatically updates after each `mapmove` or when the areamap changes, default `true`
    *   `background`: (HTML string, optional) used to set the background of the rose

&nbsp;

### `<<place_mapview>>`
Renders a visual representation of the map with the areamap tiles configured in `<<mapareas>>` of `<<new_areamap>>`. Uses the 2D visual map configured in `<<mapview>>` of `<<new_areamap>>` if available, or the 2D logic map if not. Can optionally be made clickable to navigate or display maparea names.

*   **Arguments:** 
    *   `mapname`: (string, required) map identifier
    *   `autoupdate`: (boolean, optional) whether the mapview automatically updates after each `mapmove` or when the areamap changes, default `true`
    *   `clickable`: (boolean, optional) whether mapareas can be clicked to navigate, default `true`
    *   `show_names`: (boolean, optional) whether to display area names on the mapview, default `false`
    *   `background`: (HTML string, optional) used to set the background of the mapview

&nbsp;

### `<<set_areascripts>>`
Assigns TwiceScript logic to run during mapmove process. Arguments can be set to control which mapareas trigger the scripts. Child tag order is preserved, but `<<onmapattempt>>` tags always run first, followed by:
    * when mapmove succeeds, `<<onmapstart>>` then `<<onmapend>>`
    * when mapmove fails, `<<onmapabort>>`

*   **Child Tags:**
    *   `<<onmapattempt>>`: Always runs, immediately when a mapmove is attempted
    *   `<<onmapstart>>`: Only runs when mapmove succeeds, before position is updated
    *   `<<onmapend>>`: Only runs when mapmove succeeds, after position is updated
    *   `<<onmapabort>>`: Only runs when mapmove fails
    *   **Arguments:** These child tags all take the same arguments
        *   `to`: (string|array[string]|"any", optional) maparea(s) the player is moving to
        *   `from`: (string|array[string]|"any", optional) maparea(s) the player is moving from

&nbsp;

### `<<areamapmove>>`
Manually triggers a move attempt between areas via TwineScript. Using this macro circumvents any checks that the target maparea is a neighboring maparea, allowing for more flexible navigation — but `blocked` conditions will still apply and cause mapmove to fail.

*   **Arguments:** 
    *   `mapname`: (string, required) map identifier
    *   `target`: (string, required) maparea to move to
    *   `force_abort`: (boolean, optional) true forces the mapmove to fail, default `false`

&nbsp;

### Advanced API
For logic outside of macros, the library exposes the `window.Areamap` object:

*   **`Areamap.edit_map({ mapname, ... })`**: Modify map properties or structure at runtime.
*   **`Areamap.get_map(mapname)`**: Returns a deep clone of the current map object.
*   **`Areamap.update_rose($rose)` / `Areamap.update_mapview($mapview)`**: Manually force a UI refresh on an existing element.
*   **`Areamap.begin_mapmove({ mapname, id_target })`**: Programmatically initiate a move sequence.

&nbsp;

### Example:
```html
:: Initialize [StoryInit]
<<new_areamap "dungeon" 3>>
    A B C
    D E F
    G H I
    <<mapvars position: "$dungeon_pos">>
<</new_areamap>>

:: Game_View
<<place_areamap_rose "dungeon">>

<<set_areascripts "dungeon">>
    <<onmapend to: "E">>
        You have entered the center room.
    <</onmapend>>
<</set_areascripts>>
```