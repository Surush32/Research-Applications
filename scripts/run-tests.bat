@echo off
set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  echo Git Bash not found. Install Git for Windows: https://git-scm.com/download/win
  exit /b 1
)
cd /d "%~dp0.."
"%GIT_BASH%" "%~dp0run-tests.sh" %*
