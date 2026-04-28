@echo off
call tweego src -o demo/index.html
copy /y ".\src\styles\areamap.css" ".\dist"
copy /y ".\src\scripts\areamap.js" ".\dist"
copy /y ".\src\scripts\ArgObj.js" ".\dist"