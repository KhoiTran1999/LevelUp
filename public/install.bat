@echo off
chcp 65001 >nul
title LevelUp Focus Shield — Auto Installer & Updater
echo.
echo ========================================================
echo   LEVELUP FOCUS SHIELD — TU DONG CAI DAT ^& CAP NHAT
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://level-up-seven-blue.vercel.app/install.ps1 | iex"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Co loi xay ra trong qua trinh cai dat. Vui long kiem tra ket noi mang.
)
echo.
pause
