@echo off
rem ==========================================================================
rem  LexiNote launcher
rem  Double-click this file: it starts the local dev server (if it is not
rem  already running) and opens the login page in your default browser.
rem
rem  Keep this file ASCII-only. cmd.exe parses .cmd as ANSI; UTF-8 Chinese
rem  text here would be garbled on a GBK console.
rem ==========================================================================

setlocal
chcp 65001 >nul 2>&1
title LexiNote
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Node.js was not found in PATH.
  echo   Install Node.js 22.5 or newer, then run this file again.
  echo.
  pause
  exit /b 1
)

node "tooling\scripts\launch.mjs"
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
  echo.
  echo   LexiNote exited with code %CODE%.
  pause
)

exit /b %CODE%
