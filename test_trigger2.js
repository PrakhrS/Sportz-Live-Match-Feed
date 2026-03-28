import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8000/ws');

ws.on('open', async () => {
    console.log('[TEST] WS Connected');
    
    // Trigger POST
    try {
        const res = await fetch('http://localhost:8000/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sport: "cricket",
                homeTeam: "India",
                awayTeam: "England",
                startTime: "2026-04-01T12:00:00.000Z",
                endTime: "2026-04-01T13:45:00.000Z"
            })
        });
        console.log('[TEST] POST status:', res.status);
        console.log('[TEST] POST body:', await res.text());
    } catch(e) {
        console.log('[TEST] POST error:', e);
    }
});

ws.on('message', (data) => {
    console.log('[TEST] WS Message:', data.toString());
});

setTimeout(() => {
    console.log('[TEST] Timeout reached, exiting');
    ws.close();
    process.exit(0);
}, 10000);
