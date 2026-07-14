@echo off
REM Run shell scripts via Git Bash on Windows (PowerShell "bash" uses WSL).
set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"

if not exist "%GIT_BASH%" (
  echo Git Bash not found at: %GIT_BASH%
  echo Install Git for Windows: https://git-scm.com/download/win
  exit /b 1
)

cd /d "%~dp0.."
"%GIT_BASH%" "%~dp0check-api.sh" %*
