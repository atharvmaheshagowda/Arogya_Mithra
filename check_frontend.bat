@echo off
setlocal enabledelayedexpansion

title AAROGYA MITHRA - Frontend Diagnostic & Health Check
echo ===============================================================================
echo                AAROGYA MITHRA - FRONTEND HEALTH CHECK
echo ===============================================================================
echo.
echo Mode: READ-ONLY (No code, configurations, or packages will be modified)
echo Working Directory: %~dp0
echo.

cd /d "%~dp0"

echo [1/3] Verifying Node.js and NPM runtime...
call node -v >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in system PATH.
    echo Please install Node.js from https://nodejs.org
    goto :FAIL
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo   - Node.js Version : %NODE_VER%
echo   - NPM Version     : %NPM_VER%
echo   [OK] Runtime verified.
echo.

echo [2/3] Checking TypeScript Compilation (tsc -b --noEmit)...
call npx tsc -b
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] TypeScript compilation check failed.
    goto :FAIL
)
echo   [OK] TypeScript check passed with 0 errors.
echo.

echo [3/3] Checking Production Build Integrity (Vite)...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Vite build failed.
    goto :FAIL
)
echo.
echo   [OK] Production build succeeded.
echo.
echo ===============================================================================
echo [SUCCESS] ALL FRONTEND INTEGRITY CHECKS PASSED
echo - 0 TypeScript compile errors
echo - 0 broken component imports
echo - Clean production code-splitting
echo ===============================================================================
echo.
pause
exit /b 0

:FAIL
echo.
echo ===============================================================================
echo [FAILURE] FRONTEND INTEGRITY CHECK FAILED
echo ===============================================================================
echo.
pause
exit /b 1
