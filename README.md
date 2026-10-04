# Zoom Clone

A full-stack video-conferencing application built with React, Node, Express,
Socket.IO, and MongoDB Atlas.

🚀 Live Demo : https://let-s-catch-up.vercel.app/

## Run the project locally

1. In MongoDB Atlas, rotate the database-user password that was previously
   stored in the source code. Also make sure Atlas Network Access allows your
   current IP address.
2. In `backend`, copy `.env.example` to a new file named `.env` and add the
   new Atlas connection string:

   ```env
   MONGODB_URI=your-new-atlas-connection-string
   PORT=8000
   CLIENT_ORIGIN=http://localhost:3000
   ```

3. Start the backend in one terminal:

   ```bash
   cd backend
   npm install
   npm start
   ```

   It should print both `MongoDB connected` and `Listening on port 8000`.

4. Start the frontend in another terminal:

   ```bash
   cd frontend
   npm install
   npm start
   ```

The frontend defaults to `http://localhost:8000`, so Register now sends its
request to this project's Atlas-connected backend. A successful registration
returns HTTP `201` and creates a document in the `users` collection.

## Deploying later

Do not change source code between local and production. Instead set these
environment variables in the relevant hosting dashboards and rebuild/redeploy:

| Where                      | Variable            | Value                           |
| -------------------------- | ------------------- | ------------------------------- |
| Backend host               | `MONGODB_URI`       | Your Atlas URI (keep it secret) |
| Backend host               | `CLIENT_ORIGIN`     | The complete frontend URL       |
| Frontend host (build time) | `REACT_APP_API_URL` | The complete backend URL        |

If you use multiple frontend URLs, give `CLIENT_ORIGIN` a comma-separated
list. Never commit `.env` files.
