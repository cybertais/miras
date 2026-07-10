@echo off
echo Checking for existing "gemini_miras_ai" folder...
if exist "gemini_miras_ai" (
    echo Deleting existing "gemini_miras_ai" folder...
    rmdir /s /q "gemini_miras_ai"
)

echo Creating destination folder "gemini_miras_ai"...
mkdir "gemini_miras_ai"

echo.
echo Copying standalone files...
copy ".env" "gemini_miras_ai\"
copy "composer.json" "gemini_miras_ai\"
copy "composer.lock" "gemini_miras_ai\"
copy "package-lock.json" "gemini_miras_ai\"
copy "package.json" "gemini_miras_ai\"

echo.
echo Copying directories and their contents...
xcopy "app" "gemini_miras_ai\app\" /E /I /H /Y
xcopy "config" "gemini_miras_ai\config\" /E /I /H /Y
xcopy "resources" "gemini_miras_ai\resources\" /E /I /H /Y
xcopy "routes" "gemini_miras_ai\routes\" /E /I /H /Y

echo.
echo Copy operation complete!
pause