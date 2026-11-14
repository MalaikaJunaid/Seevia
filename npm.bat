@echo off
REM npm.bat - Delegates to the system Node.js npm
REM This bypasses the recursive call issue by directly invoking npm.cmd

setlocal
for /f "delims=" %%i in ('where npm.cmd') do set NPM_CMD=%%i

if defined NPM_CMD (
    "%NPM_CMD%" %*
    exit /b !ERRORLEVEL!
) else (
    echo Error: npm not found in PATH
    exit /b 1
)
