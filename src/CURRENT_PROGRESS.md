- Areamap in publishable state

- experimental grid mode started
- finished rewriting update_exits to accept grid_movement
- finished rose part
- finished mapview
- reviewed autoupdate
- added to_x, to_y, from_x, from_y to set_scripts
- finished updating begin_mapmove & resolve_mapmove
- tested rose & mapview
- added barriers, seems to work in both grid & node modes
- tested that scripts properly fire
- renamed to node & grid
- updated scripts to be cross compatible with node & grid mode, seems to work
- added edit_exits & its macro wrappers
- changed how rose renders in grid mode so that the manual exits appear, rewrote exits.grid structure
- added labels to rose and mapview

- added entities
- added entities to mapmove events
- changed name to metadata on argObj
- changed map to class that has properties set/get from State
- remove class, changed to proxy
- removed update_rose & update_mapview for update_interface
- added keydown listener

- need to add pathing
- need to update documentation