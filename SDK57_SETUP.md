# SmartCare — Expo SDK 57 fixed version

This version is upgraded from Expo SDK 52 to Expo SDK 57 so it can open in the current Expo Go on iOS.

## Requirements

- Node.js 22.13.x or newer in the Node 22 line (Expo SDK 57 requirement)
- npm
- Expo Go for SDK 57

## Clean install on Windows

In this project folder:

```cmd
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm install
npx expo start -c
```

If Windows says a folder is in use, close VS Code terminals/Expo processes first and repeat.

## Why this version is needed

Expo Go on the user's iPhone is SDK 57, while the previous SmartCare project was SDK 52. Expo Go only supports the current SDK line, so the project must be upgraded rather than trying to install an old Expo Go on iOS.
