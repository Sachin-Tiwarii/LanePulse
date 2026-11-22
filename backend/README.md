# LanePulse Backend

## About LanePulse

LanePulse is an AI-powered emergency green corridor system designed to simulate an emergency vehicle's journey through city roads and coordinate traffic signal priority.

This repository contains the backend developed using Node.js and Express.js.

## Tech Stack

- Node.js
- Express.js
- MongoDB / Mongoose
- JWT Authentication
- bcrypt
- Axios

## Backend Structure

```text
LanePulse-Backend/
├── config/
├── controllers/
├── routes/
├── services/
├── models/
├── middleware/
├── validators/
├── utils/
├── .env
├── .gitignore
├── package.json
└── server.js
```

## APIs

### Health Check
- GET `/api/health`

### Authentication
- POST `/api/auth/register`
- POST `/api/auth/login`

### AI APIs
- POST `/api/ai/route`
- POST `/api/ai/traffic/analyze`
- POST `/api/ai/signal/plan`

### Simulation APIs
- POST `/api/simulation/start`
- GET `/api/simulation/:sessionId`
- POST `/api/simulation/:sessionId/signal-plan`
- POST `/api/simulation/:sessionId/intersection-cleared`

## Setup Instructions

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Create a `.env` file.
4. Configure the environment variables.
5. Run the server using `npm run dev`.

## Environment Variables

```env
PORT=5000
JWT_SECRET=your_secret_key
MONGODB_URI=your_mongodb_connection_string
```

## Current Status

- Backend server setup completed.
- Authentication APIs created.
- AI and simulation API endpoints created as placeholders.
- Python AI service integration pending.
- MongoDB integration pending.

## Project

LanePulse – AI-Powered Emergency Green Corridor System
