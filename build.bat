@echo off
call tweego src -o demo/index.html
copy /y ".\src\styles\Sleepymap.css" ".\dist"
copy /y ".\src\scripts\Sleepymap.js" ".\dist"
copy /y ".\src\scripts\ArgObj.js" ".\dist"