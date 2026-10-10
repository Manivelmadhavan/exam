@echo off
setlocal
cd /d "%~dp0"
for %%L in (python java cpp) do (
  echo Building exam-runner-%%L ...
  docker build -t exam-runner-%%L docker\%%L
  if errorlevel 1 exit /b 1
)
echo Done.
endlocal
