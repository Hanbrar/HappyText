@echo off
echo Installing dependencies...
pip install -r requirements.txt
pip install pyinstaller

echo.
echo Building CleanWriteAI.exe...
pyinstaller ^
  --onefile ^
  --windowed ^
  --name CleanWriteAI ^
  --icon assets\icon.ico ^
  --add-data "assets;assets" ^
  --collect-all transformers ^
  --collect-all tokenizers ^
  main.py

echo.
echo Done! Executable is at dist\CleanWriteAI.exe
pause
