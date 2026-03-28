import http from 'http';
import express from 'express';
import { attachWebSocketServer } from './ws/server.js';
import WebSocket from 'ws';

const app = express();
const server = http.createServer(app);
const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

app.post('/matches', (req, res) => {
    const event = { id: 99, sport: "cricket" };
    console.log("Triggering broadcast");
    res.app.locals.broadcastMatchCreated(event);
    res.status(201).json(event);
});

server.listen(8001, () => {
    console.log("Test server ready on 8001");
    // Connect WS
    const ws = new WebSocket('ws://localhost:8001/ws');
    ws.on('open', async () => {
        console.log("WS open, doing POST");
        const r = await fetch('http://localhost:8001/matches', { method: 'POST' });
        console.log("POST status:", r.status);
    });
    ws.on('message', (data) => {
        console.log("WS Received:", data.toString());
        if (data.toString().includes('match_created')) {
            console.log("SUCCESS!");
            process.exit(0);
        }
    });
});
