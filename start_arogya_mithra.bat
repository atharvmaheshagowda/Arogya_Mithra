@echo off
title Arogya Mithra Launcher
echo ============================================================
echo   AROGYA MITHRA - One-Click Application Launcher
echo   Starting Backend (FastAPI :8000) and Frontend (Vite :5173)
echo ============================================================
echo.

REM Determine target application directory
if exist "%~dp0package.json" (
    cd /d "%~dp0"
) else if exist "%~dp0Arogya_Mithra\package.json" (
    cd /d "%~dp0Arogya_Mithra"
) else (
    echo [ERROR] Could not locate Arogya_Mithra directory!
    pause
    exit /b 1
)

echo Working directory: %CD%
echo.

REM 1. Start FastAPI Backend in a separate window
echo [1/3] Launching FastAPI Backend on http://127.0.0.1:8000...
start "Arogya Mithra - Backend (FastAPI)" cmd /k "set PYTHONPATH=backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM 2. Start Vite Frontend in a separate window
echo [2/3] Launching Vite React Frontend on http://localhost:5173...
start "Arogya Mithra - Frontend (React / Vite)" cmd /k "npm run dev"

REM 3. Wait briefly for services to initialize and launch browser
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 6 >nul

echo Opening browser to http://localhost:5173/consultations...
start http://localhost:5173/consultations

echo.
echo ============================================================
echo   Both servers are running in separate terminal windows!
echo   - Backend:  http://127.0.0.1:8000 (API Docs: http://127.0.0.1:8000/docs)
echo   - Frontend: http://localhost:5173/consultations
echo.
echo   To stop the application, simply close the two server windows.
echo ============================================================
echo.
pause
