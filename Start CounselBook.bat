@echo off
rem CounselBook launcher - opens the app in Microsoft Edge "app mode" (no install needed).
rem Data is kept in a private browser profile under %LOCALAPPDATA%\CounselBook,
rem so clearing normal Edge history will not remove it.
setlocal
set "APP=%~dp0index.html"
set "URL=file:///%APP:\=/%"
set "PROFILE=%LOCALAPPDATA%\CounselBook\BrowserProfile"
set "FLAGS=--user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check --disable-sync --window-size=1400,880"

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" %FLAGS%
  exit /b
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app="%URL%" %FLAGS%
  exit /b
)

echo Microsoft Edge was not found. Opening in the default browser instead...
start "" "%APP%"
