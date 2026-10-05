# Perplone — AI Chat Platform

Perplone is a full-stack AI chat application built with **Node.js, Express, MongoDB, and vanilla HTML/CSS/JavaScript**. It provides secure user authentication, persistent chat history, AI-powered conversations through OpenRouter, and an administrator dashboard for user and chat management.

## Features

- User registration and sign-in
- Sign-in using either username or email
- Password hashing with bcrypt
- JWT-based authentication with 8-hour token expiry
- Role-based access for users and administrators
- AI chat interface powered through OpenRouter
- Persistent MongoDB chat history
- Create, load, search, pin, archive, and delete chat sessions from the UI
- Admin dashboard with user statistics and user search
- Admin access to individual users' chat histories
- Responsive frontend served directly by Express
- Token validation for protected pages and API routes

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Token (JWT) |
| Password Security | bcrypt |
| AI Integration | OpenRouter API |
| Development | Nodemon |
| Other | CORS, dotenv |

## Project Structure

```text
Projects/
├── public/
│   ├── admin.html
│   ├── auth.html
│   ├── index.html
│   ├── ai-logo.png
│   ├── perplone.png
│   └── user-logo.png
├── .env
├── package.json
├── package-lock.json
└── server.js
```

`auth.html` handles sign-in and registration, `index.html` contains the main AI chat interface, and `admin.html` provides the administrator dashboard. The Express backend and MongoDB models are implemented in `server.js`.

## Prerequisites

Before running the project, install:

- Node.js
- npm
- MongoDB, either locally or through a MongoDB-compatible hosted service
- An OpenRouter API key

## Installation

Clone or download the project and open a terminal in the project directory.

```bash
npm install
```

Create or update the `.env` file:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/perplone
JWT_SECRET=replace_with_a_long_random_secret
```

Make sure MongoDB is running, then start the application:

```bash
npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000/auth.html
```

Open Index.html:

Change the OPENROUTER_API_KEY:

```code
const OPENROUTER_API_KEY = "YOUR_OLD_KEY";
```

## Authentication Flow

1. A new user registers with a username, email, and password.
2. The backend validates the submitted information.
3. Passwords are hashed using bcrypt before being stored.
4. A JWT is issued after successful registration or sign-in.
5. The frontend stores the token and sends it in the `Authorization` header when accessing protected API endpoints.
6. Protected routes verify the JWT before returning user or chat information.

The current implementation assigns the `admin` role automatically when a user signs up with the username `admin`. This behavior is suitable only for development and should be replaced with a secure administrator provisioning mechanism before production deployment.

## API Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/signup` | Register a user | No |
| `POST` | `/api/signin` | Sign in with username/email and password | No |
| `GET` | `/api/validate-token` | Validate a JWT and return user details | JWT |
| `GET` | `/api/chat-history` | Retrieve the current user's chats | JWT |
| `POST` | `/api/chat-history` | Synchronize the current user's chat history | JWT |
| `GET` | `/api/users` | Retrieve registered users | Admin JWT |
| `GET` | `/api/admin/user-chats/:userId` | Retrieve chats belonging to a selected user | Admin JWT |

Authenticated requests use:

```http
Authorization: Bearer <token>
```

## Database Models

### User

The user collection stores:

- Username
- Email
- Hashed password
- Role (`user` or `admin`)
- Account creation time
- Last-seen time

### Chat History

Each chat stores:

- User ID
- Chat title
- Messages
- Message type
- Pinned status
- Archived status
- Creation time

Chat records are associated with their owner through the MongoDB user ID.

## AI Integration

The chat frontend sends conversation messages to the OpenRouter chat-completions API and displays the generated response in the conversation interface.

The current source uses:

```text
xiaomi/mimo-v2-flash:free
```

as the configured model.

## Security Notes

**Do not commit API keys, JWT secrets, database credentials, or other secrets to GitHub.**

The supplied project currently contains an OpenRouter API credential directly in frontend JavaScript. Because frontend source code is visible to every browser user, that credential must be considered exposed. **Revoke/rotate the existing key before publishing the repository.**

For a safer production design:

- Store the OpenRouter API key only in `.env`.
- Send AI requests through a protected backend endpoint instead of directly from the browser.
- Never expose the AI provider key to client-side JavaScript.
- Use a strong, randomly generated `JWT_SECRET`.
- Do not rely on a default JWT secret.
- Replace username-based admin creation with controlled administrator provisioning.
- Restrict CORS to trusted origins.
- Use HTTPS in production.
- Add rate limiting to authentication and AI endpoints.
- Validate and sanitize all incoming data.
- Keep `.env` excluded through `.gitignore`.

A recommended `.gitignore` is:

```gitignore
node_modules/
.env
*.log
.DS_Store
```

## Available Scripts

```bash
npm start
```

Starts the application with Node.js.

```bash
npm run dev
```

Starts the application with Nodemon and automatically restarts the server when backend files change.

## Future Improvements

Potential improvements include moving all AI requests to the backend, adding refresh-token/session management, implementing password reset and email verification, adding per-user rate limits, improving chat synchronization, adding pagination for large chat histories, strengthening admin provisioning, and deploying the frontend, backend, and database using production-ready infrastructure.

## Disclaimer

This project is intended for educational and development purposes. Review the authentication, authorization, secret management, API usage, database security, and deployment configuration before using it in a production environment.
