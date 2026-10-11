@echo off
rem Installe Ptt-Makers sur cet ordinateur et pose un raccourci sur le bureau.
if not exist "%~dp0outils\installer-windows.ps1" (
  echo Decompresse d'abord le dossier : clic droit sur le fichier .zip, puis "Extraire tout".
  echo.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outils\installer-windows.ps1"
echo.
pause
