# DogApp v2

DogApp v2 is a full-stack mobile and web application to manage your furry friends. Users can create an account, add and edit dog profiles, view a personalized dashboard, and more.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Project Structure](#project-structure)
- [Planned Features](#planned-features)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- User authentication (signup, login)
- Add, edit, and delete dog profiles
- Dashboard showing all added dogs
- Dog profile details with photo and metadata
- Responsive design for both iOS, Android, and web
- Secure data storage via Firebase

---

## Installation

### Prerequisites

- Node.js (>= 14.x)
- npm or yarn
- Expo CLI (for frontend)
- Firebase account and project

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `serviceAccountKey.json.example` to `serviceAccountKey.json` and configure credentials.
4. Update `firebase-config.js` with your Firebase settings.
5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend/dogapp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the app in `app.json` if needed (Firebase, Google API keys, etc.).
4. Start Expo:
   ```bash
   expo start
   ```

---

## Project Structure

```
backend/
  – server.js
  – firebase-config.js
  – dogUploadPicture.js
  – ...
frontend/dogapp/
  – App.js (root)
  – index.js
  – screens/
      AddDogScreen.js
      DashboardScreen.js
      ...
  – services/
  – contexts/
  – components/
  – assets/
```

---

## Planned Features

- Option to check in your dog to the nearest dog park
- Dog friend lists for socialization
- Administrative panel to manage users and content
- Notifications and reminders
- In-app messaging between pet owners
- And many more!

---

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

---

## License

This project is licensed under the 0BSD License.
