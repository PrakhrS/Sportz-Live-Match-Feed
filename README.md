# Sportz Live Match Feed 

A high-performance, event-driven backend service designed to provide real-time sports match updates and live commentary using pure WebSockets. Built with modern architecture focusing on speed, security, and type safety.

## Tech Stack & Tooling
- **Core Environment:** Node.js & Express.js
- **Real-Time Communication:** Native WebSockets (`ws`)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Security & Rate Limiting:** Arcjet (`@arcjet/node`)
- **Data Validation:** Zod

## System Architecture & Features
- **Event-Driven WebSockets:** Utilizes Node.js `EventEmitter` to broadcast database changes directly to connected WebSocket clients in real time.
- **Dynamic Subscription Model:** Clients can subscribe/unsubscribe to specific `matchId`s to receive targeted commentary updates without overloading the network.
- **Connection Management:** Implements automatic "ping/pong" heartbeats to detect and cleanly terminate inactive WebSocket connections, preventing memory leaks.
- **Robust Security:** Integrated Arcjet middleware to protect HTTP and WebSocket routes from bots and enforce strict rate-limiting.
- **Type-Safe Database:** Designed PostgreSQL schemas (Matches, Commentary, Enum Statuses) using Drizzle ORM for fast, type-safe database queries.

## Local Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PrakhrS/Sportz-Live-Match-Feed.git
   cd Sportz-Live-Match-Feed

2. **Install dependencies:**
   npm install

3. **Environment Configuration:**
   Create a .env file in the root directory and configure your PostgreSQL URL and          Arcjet Key:
   ```bash
    PORT=8000
    DATABASE_URL=postgres://user:password@localhost:5432/sportz_db
    ARCJET_KEY=your_arcjet_key


5. **Database Migrations:**
   ```bash
    npm run db:generate
    npm run db:migrate

6. **Run the Development Server:**
   ```bash
   npm run dev


**API & WebSocket Usage**
HTTP REST Endpoints

GET /matches - Fetch all matches

POST /matches - Create a new match (Broadcasts match_created WS event)

GET /matches/:id/commentary - Fetch historical commentary for a match

POST /matches/:id/commentary - Post new commentary (Broadcasts commentary WS event to subscribed clients)

WebSocket Connection (ws://localhost:8000/ws)

Connect via any WebSocket client (e.g., Postman WS, Hoppscotch) and send JSON payloads to manage subscriptions:

1. **Subscribe to a Match::**
   ```bash
   {
  "type": "subscribe",
  "matchId": 1
}

2. **Unsubscribe from a Match:**
   ```bash
   {
  "type": "unsubscribe",
  "matchId": 1
}

3. **Real-Time Payloads Received:**
   Once subscribed, the server will push live updates formatted like this:
   ```bash
   {
  "type": "commentary",
  "data": {
    "matchId": 1,
    "minute": 45,
    "message": "Incredible goal from outside the box!"
  }
}



**Note**: _This repository serves as the backend infrastructure and is designed to be tested via API clients like Postman or integrated with a frontend application._
