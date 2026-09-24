@echo off
title CSE Divo — Gestion Financiere
color 0A
cls

echo ============================================================
echo    COURS SECONDAIRE ELITES DIVO — Systeme de Gestion
echo ============================================================
echo.

:: Verifier si Node.js est installe
where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe. Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)

:: Verifier MySQL
echo [INFO] Demarrage du systeme...
echo.

:: Demarrer le serveur backend dans un nouveau terminal
echo [1/2] Demarrage du serveur backend (port 4000)...
start "CSE Backend" cmd /k "cd /d "%~dp0server" && echo Backend CSE Divo - Port 4000 && npm run dev"

:: Attendre que le serveur demarre
timeout /t 3 /nobreak >nul

:: Demarrer le frontend dans un nouveau terminal  
echo [2/2] Demarrage de l'interface (port 5173)...
start "CSE Frontend" cmd /k "cd /d "%~dp0" && echo Frontend CSE Divo - Port 5173 && npm run dev"

:: Attendre que Vite demarre
timeout /t 4 /nobreak >nul

:: Ouvrir le navigateur
echo.
echo [OK] Application demarree !
echo      Backend  : http://localhost:4000/api/health
echo      Frontend : http://localhost:5173
echo.
start http://localhost:5173

echo Fermeture de cette fenetre dans 5 secondes...
timeout /t 5 /nobreak >nul
