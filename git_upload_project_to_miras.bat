@echo off
echo ========================================
echo       Git Auto-Update Script
echo ========================================

:: Step 1: Add all new and changed files
echo Adding changes...
git add .

:: Step 2: Prompt for a commit message
set /p msg="Enter a brief commit message: "

:: Step 3: Commit the changes
echo Committing changes...
git commit -m "%msg%"

:: Step 4: Push to GitHub
echo Pushing to GitHub...
git push

echo ========================================
echo       Update Complete!
echo ========================================
pause