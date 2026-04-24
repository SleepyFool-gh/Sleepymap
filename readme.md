# `Areamap` Library

Map library for SugarCube for moving between areas. This library is for room-to-room movement like **Darkest Dungeon** or node-to-node movement like **Faster Than Light** — NOT for grid movement like **Zelda** or **Final Fantasy Tactics**.

&nbsp;

### Default behavior:
`Areamap` takes a space-separated 2D text grid and converts it into a functional map that a player can navigate through. All grid spaces with the same ID will be treated as one big room, regardless of how many spaces it occupies or whether it is continuous.

This library includes two built-in options for navigation:
1) a compass rose with directional buttons
2) a visual map with (optionally) clickable rooms

#### Features:
    - Scripts can be assigned to run at various stages of the movement process.
    - The 2D grid used to generate the mapview can be different from the 2D grid used for map logic.
    - Diagonal movement can be enabled / disabled.
    - Movement links can be hidden (secret), disabled (`mapmove` prevented), or blocked (`mapmove` starts but aborts).

&nbsp;

### Usage:

### `<<new_areamap>>`
Used to define a new areamap. This macro **must** be called during `StoryInit`. It accepts a 2D grid layout via its contents and supports optional child tags for advanced configuration.

*   **Arguments:** `mapname` (string), `columns` (number), `diagonals` (boolean, optional).
*   **Contents:** 2D space-separated text representation of areamap logic, must be rectangular.
*   **Child Tags:**
    *   `<<mapview>>`: Defines a different 2D grid to use for mapview instead of the map logic grid
        *   **Arguments:** `columns` (number)
        *   **Contents:** 2D space-separated text representation of mapview, must be rectangular.
    *   `<<mapvars>>`: Links map state to various Story Variables for map behavior manipulation. `position` will update automatically when `mapmove` succeeds.
        *   **Arguments:** 
            *   `position` (string, Story Variable name) stores current areamap position, as a string
            *   `frozen` (string, Story Variable name) stores whether ALL links are disabled, as a boolean
            *   `disabled` (string, Story Variable name) stores disabled state of each maparea, as an object of booleans
            *   `hidden` (string, Story Variable name) stores hidden state of each maparea, as an object of booleans
            *   `blocked` (string, Story Variable name) stores blocked state of each maparea, as an object of booleans
    *   `<<mapareas>>`: Defines maparea metadata for each map ID.
        *   **Arguments:**
            *   `name` (string) used for links
            *   `type` (string) used for determining navigation behavior, anything not "wall" will be treated as "floor"
            *   `tile` (HTML string) used for the mapview display

&nbsp;

### `<<place_areamap_rose>>`
Generates a 3x3 grid of directional links for navigation.

*   **Arguments:** `mapname` (string), `autoupdate` (boolean, optional), `background` (string, optional).

&nbsp;

### `<<place_mapview>>`
Renders a visual representation of the map. Areas are displayed as a grid, and if configured, tiles can be clicked to navigate the player to a target area.

*   **Arguments:** `mapname` (string), `autoupdate` (boolean, optional), `clickable` (boolean, optional), `background` (string, optional), `show_names` (boolean, optional).

&nbsp;

### `<<set_areascripts>>`
Assigns logic to be executed during the movement process. Scripts are triggered based on the origin (`from`) and destination (`to`) areas.

*   **Tags:**
    *   `<<onmapattempt>>`: Runs immediately when a move is initiated.
    *   `<<onmapstart>>`: Runs before the position variable is updated.
    *   `<<onmapend>>`: Runs after the position variable is successfully updated.
    *   `<<onmapabort>>`: Runs if a move is blocked or forced to abort.

&nbsp;

### `<<areamapmove>>`
Manually triggers a move attempt between areas via TwineScript.

*   **Arguments:** `mapname` (string), `id` (string), `force_abort` (boolean, optional).

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