@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo FARMACOR - Reinstalar notificaciones detalladas
 echo ============================================================
cd backend
python manage.py instalar_seguridad_bd
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo reinstalar la proteccion.
  echo Verifique que MySQL este encendido y que el backend use farmacia_db.
  pause
  exit /b 1
)
echo.
echo [OK] Triggers actualizados. Ahora se registran campos y valores intentados.
pause
