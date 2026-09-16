@echo off
chcp 65001 >nul
title FARMACOR - Instalar seguridad de base de datos
cd /d "%~dp0backend"

echo.
echo ============================================================
echo  FARMACOR - PROTECCION MYSQL + NOTIFICACIONES
ECHO ============================================================
echo.

python manage.py instalar_seguridad_bd

if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo instalar la proteccion.
    echo Revisa que MySQL este encendido y que Django conecte a farmacia_db.
    pause
    exit /b 1
)

echo.
echo [OK] Proteccion instalada.
echo Los cambios realizados desde Django siguen permitidos.
echo Los cambios directos desde phpMyAdmin/Workbench quedan bloqueados.
echo Los intentos apareceran en la campana de Notificaciones.
echo.
pause
