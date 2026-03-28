import { WebSocket, WebSocketServer } from "ws"
import { matchEvents } from "../src/events.js"
import { wsArcjet } from "../src/arcjet.js"

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
        noServer: true,
        maxPayload: 1024 * 1024,
    })

    server.on('upgrade', async (req, socket, head) => {
        const pathname = req.url ? req.url.split('?')[0] : '';
        if (pathname !== '/ws') {
            return;
        }

        if(wsArcjet){
            try {
                const decision = await wsArcjet.protect(req)

                if(decision.isDenied()){
                    const status = decision.reason.isRateLimit() ? 429 : 403
                    const reason = decision.reason.isRateLimit() ? 'Too Many Requests' : 'Forbidden'

                    socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`)
                    socket.destroy()
                    return
                }
            } catch (error) {
                console.error('WS upgrade error', error)
                socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n')
                socket.destroy()
                return
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req)
        })
    })

    wss.on('connection', (socket, req) => {

        socket.isAlive = true;
        
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        console.log('[WS] New connection established!');
        sendJson(socket, { type: 'welcome' })

        socket.on('error', console.error)
    })

    const interval = setInterval(() => {
        for (const socket of wss.clients) {
            if (socket.isAlive === false) {
                console.log('[WS] Terminating inactive connection');
                socket.terminate();
                continue;
            }

            socket.isAlive = false;
            socket.ping();
        }
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    matchEvents.on('match_created', (match) => {
        console.log('[WS] Received match_created event, broadcasting...');
        broadcast(wss, { type: 'match_created', data: match })
    })

    return {}
}