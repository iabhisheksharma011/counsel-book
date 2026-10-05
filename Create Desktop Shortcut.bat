@echo off
rem Creates a "CounselBook" shortcut on the desktop that opens the app.
setlocal
set "TARGET=%~dp0Start CounselBook.bat"
set "ICON=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\CounselBook.lnk');" ^
  "$s.TargetPath='%TARGET%'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Description='CounselBook - school counselling records';" ^
  "if(Test-Path '%ICON%'){$s.IconLocation='%ICON%,0'}; $s.Save()"
echo Shortcut "CounselBook" created on your desktop.
pause
