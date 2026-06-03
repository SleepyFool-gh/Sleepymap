# Sleepymap — a SugarCube library for 2D maps

`Sleepymap` is a map library for SugarCube which takes a 2D text grid (`maparray`) and converts it into a functional map for player movement (`mapmove`). It has two modes:
1. **`node travel`:** Node-to-node movement like **Faster Than Light** or room-to-room movement like **Darkest Dungeon**. All grid spaces with the same id will be treated as one big room (`mapnode`) — regardless of how many grid spaces it occupies or whether it is continuous or not. Adjacent `mapnode` will be connected by `exits` that allow navigation between them. Because `mapnode` size is irrelevant, multiple links to different rooms may appear in the same direction on the `rose`
2. **`grid travel`:** Grid movement like **Zelda** or **Final Fantasy Tactics**. Adjacent grid spaces with the same id will inherit the same properties, but will need to be traversed through one grid space at a time. Each grid space is connected by `exits` to adjacent grid spaces it can reach.

<div><a href='https://sleepyfool-gh.github.io/Sleepymap/demo/index.html'>Check out the demo here</a></div>
<div><a href='https://sleepyfool-gh.github.io/Sleepymap/'>Read the documentation here</a></div>

## Files

- [areamap.js](./dist/areamap.js) — Main library definitions
- [areamap.css](./dist/areamap.css) — Library styling
- [ArgObj.js](./dist/ArgObj.js) — Required argument parsing dependency