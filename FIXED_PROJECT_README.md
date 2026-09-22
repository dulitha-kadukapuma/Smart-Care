# SmartCare — Fixed Project

This copy removes generated/build folders and fixes the duplicate `app.js` entry-point,
the misspelled prescription route filename, and the queue reset crash when the Firestore
queue document does not already exist.

## Run on Windows

1. Open PowerShell in this folder.
2. Install dependencies:
   `npm install`
3. Start Expo:
   `npx expo start -c`
4. Scan the QR code with a compatible Expo Go app.

## Firebase

The Firebase configuration is in:
`src/config/firebase.js`

Firestore collections expected by the current app:
- `users`
- `doctors`
- `queues`
- `tokens`
- `prescriptions`

A user document should contain a `role` such as `patient`, `doctor`, or `pharmacy`.

## Important

The uploaded project does not contain the earlier Node/Express/MySQL backend.
This fixed folder therefore keeps the current Firebase/Firestore architecture.
