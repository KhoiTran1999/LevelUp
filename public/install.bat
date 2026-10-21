@echo off
chcp 65001 >nul
title LevelUp Focus Shield Installer
echo ========================================================
echo    LEVELUP FOCUS SHIELD - 1-CLICK INSTALLER ^& UPDATER
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://level-up-nu-two.vercel.app/install.ps1 | iex"
pause
