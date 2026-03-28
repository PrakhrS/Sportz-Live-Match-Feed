import { WebSocket, WebSocketServer } from "ws"
import { matchEvents } from "../src/events.js"
import { wsArcjet } from "../src/arcjet.js"


const matchSubscribers = new Map()

function subscribe(matchId, socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId, new Set())
    }

    matchSubscribers.get(matchId).add(socket)
}

function unsubscribe(matchId, socket){
    const subscribers = matchSubscribers.get(matchId)

    if(!subscribers) return

    subscribers.delete(socket)

    if(subscribers.size === 0){
        matchSubscribers.delete(matchId)
    }
}

function cleanupSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId, socket)
    }
}

function broadcastToAll(wss, payload) {
    console.log('[WS] Broadcasting payload to', wss.clients.size, 'clients');
    for (const client of wss.clients) {
        // BUG FIX: use continue instead of return, otherwise loops stops matching completely!
        if (client.readyState !== WebSocket.OPEN) continue

        client.send(JSON.stringify(payload))
    }
}


function broadcastToMatch(matchId, payload){
    const subscribers = matchSubscribers.get(matchId)
    if (!subscribers || subscribers.size === 0) return

    const message = JSON.stringify(payload)

    for(const client of subscribers){
        if(client.readyState === WebSocket.OPEN){
            client.send(message)
        }
    }
}

function handleMessage(socket, data){
    let message

    try {
        message = JSON.parse(data.toString())
    } catch  {
        sendJson(socket, {type: 'error', message: 'Invalid JSON'})
        return
    }

    if(message?.type === "subscribe" && Number.isInteger(message.matchId)){
        subscribe(message.matchId, socket)
        socket.subscriptions.add(message.matchId)
        sendJson(socket, { type: 'subscribed', matchId: message.matchId})
        return
    }

    if(message?.type === "unsubscribe" && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId, socket)
        socket.subscriptions.delete(message.matchId)
        sendJson(socket, {type: 'unsubscribed', matchId: message.matchId})
        return
    }
}

function sendJson(socket, payload) {
    console.log('[WS] Sending payload:', payload, 'State:', socket.readyState, 'Expected OPEN:', WebSocket.OPEN)
    if (socket.readyState !== WebSocket.OPEN) return

    socket.send(JSON.stringify(payload))
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

        socket.subscriptions = new Set()
        
        console.log('[WS] New connection established!');
        sendJson(socket, { type: 'welcome' })

        socket.on('message', (data) => {
            handleMessage(socket, data)
        })

        socket.on('error', () => {
            socket.terminate()
        })
        socket.on('close', () => {
            cleanupSubscriptions(socket)
        })
        
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
        broadcastToAll(wss, { type: 'match_created', data: match })
    })

    // function broadcastMatchCreated(match){
    //     broadcastToAll(wss, {type: 'match_created', data: match})
    // }

    matchEvents.on('commentary', (matchId, comment) => {
        console.log('[WS] Received commentary event, broadcasting...');
        broadcastToMatch(matchId, { type: 'commentary', data: comment })
    })

    // function broadcastCommentary(matchId, comment){
    //     broadcastToMatch(matchId, {type: 'commentary', data: comment})
    // }

    // return {broadcastMatchCreated, broadcastCommentary}
    return {}
}