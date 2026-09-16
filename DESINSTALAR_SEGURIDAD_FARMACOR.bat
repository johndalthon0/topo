@echo off
chcp 65001 >nul
title FARMACOR - Modo mantenimiento
cd /d "%~dp0backend"
python manage.py desinstalar_seguridad_bd
pause
