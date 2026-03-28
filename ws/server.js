import { WebSocket, WebSocketServer } from "ws"
import { matchEvents } from "../src/events.js"

function sendJson(socket, payload) {
    console.log('[WS] Sending payload:', payload, 'State:', socket.readyState, 'Expected OPEN:', WebSocket.OPEN)
    if (socket.readyState !== WebSocket.OPEN) return

    socket.send(JSON.stringify(payload))
}

function broadcast(wss, payload) {
    console.log('[WS] Broadcasting payload to', wss.clients.size, 'clients');
    for (const client of wss.clients) {
        // BUG FIX: use continue instead of return, otherwise loops stops matching completely!
        if (client.readyState !== WebSocket.OPEN) continue

        client.send(JSON.stringify(payload))
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024,
    })

    wss.on('connection', (socket) => {
        console.log('[WS] New connection established!');
        sendJson(socket, { type: 'welcome' })

        socket.on('error', console.error)
    })

    matchEvents.on('match_created', (match) => {
        console.log('[WS] Received match_created event, broadcasting...');
        broadcast(wss, { type: 'match_created', data: match })
    })

    return {}
}