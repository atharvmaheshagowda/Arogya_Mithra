@echo off
setlocal enabledelayedexpansion

title AAROGYA MITHRA - Backend Diagnostic & Test Suite
echo ===============================================================================
echo                AAROGYA MITHRA - BACKEND HEALTH CHECK
echo ===============================================================================
echo.
echo Mode: READ-ONLY (No code, database, or migrations will be modified)
echo Working Directory: %~dp0backend
echo.

cd /d "%~dp0backend"

echo [1/3] Locating Python virtual environment...
set "PYTHON_EXE="
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
    echo   - Using local virtual environment: backend\.venv
) else (
    call python --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PYTHON_EXE=python"
        echo   - Using global Python in PATH
    )
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] No Python interpreter found.
    echo Please ensure backend\.venv is initialized or Python is added to PATH.
    goto :FAIL
)

for /f "tokens=*" %%i in ('"%PYTHON_EXE%" --version') do set PY_VER=%%i
echo   - %PY_VER%
echo   [OK] Python interpreter ready.
echo.

echo [2/3] Checking core backend dependencies...
"%PYTHON_EXE%" -c "import fastapi, pydantic, sqlalchemy, pytest; print('  - FastAPI, Pydantic, SQLAlchemy & Pytest imported successfully')"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Critical backend dependencies are missing.
    goto :FAIL
)
echo   [OK] Core dependencies verified.
echo.

echo [3/3] Running Pytest Suite across all clinical and safety modules...
echo -------------------------------------------------------------------------------
"%PYTHON_EXE%" -m pytest tests/ -v --tb=short
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Backend pytest suite failed.
    goto :FAIL
)
echo -------------------------------------------------------------------------------
echo.
echo ===============================================================================
echo [SUCCESS] ALL BACKEND UNIT AND CLINICAL INTEGRATION TESTS PASSED
echo - Clinical context aggregation
echo - Deterministic medication safety gating
echo - Structured SOAP note generation and disclaimers
echo - Allergy and FHIR demographic models
echo ===============================================================================
echo.
pause
exit /b 0

:FAIL
echo.
echo ===============================================================================
echo [FAILURE] BACKEND HEALTH CHECK FAILED
echo ===============================================================================
echo.
pause
exit /b 1
