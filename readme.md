# `areamap` Library

Map navigtaion system for SugarCube based around areas NOT individual grid cells. Every grid cell with the same area id will be treated as one big area that players can move to and from. Authors can generate a compass rose for navigation or enable directly clicking on the map view.

&nbsp;

### Default behavior:
The `areamap` system creates a persistent grid of locations. It handles navigation (both 4 and 8-directional), manages pathing via `exits` objects, and provides reactive UI elements (`rose` for navigation, `mapview` for visual layout) that update automatically as the player moves.

All maps are stored in a central repository, allowing for global state tracking and external manipulation.

&nbsp;

### Usage:

### `<<new_areamap>>`
Used to define a map structure. This macro **must** be called during `StoryInit`. It accepts a grid layout via its contents and supports child tags for advanced configuration.

*   **Arguments:** `mapname` (string), `columns` (number), `diagonals` (boolean, optional).
*   **Child Tags:**
    *   `<<mapview>>`: Defines visual parameters (columns and array).
    *   `<<mapvars>>`: Links Story Variables to map state (`position`, `frozen`, `disabled`, `hidden`, `blocked`).
    *   `<<mapareas>>`: Defines metadata (names, types, and tiles) for each map ID.

&nbsp;

### `<<place_areamap_rose>>`
Generates a 3x3 grid of directional links for navigation. It automatically detects available exits based on the map definition and the current position.

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