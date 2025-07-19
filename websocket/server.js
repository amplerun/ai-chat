const WebSocket = require('ws');
const http = require('http');

const wss = new WebSocket.Server({ port: 8080 });
console.log('WebSocket server started on port 8080');

// Map to store userId for each WebSocket client
const clients = new Map();

wss.on('connection', (ws, req) => {
    // The initial message from a client should be its userId
    ws.on('message', message => {
        try {
            const data = JSON.parse(message);

            // 1. Handle user registration on connect
            if (data.type === 'register') {
                const userId = data.userId;
                clients.set(userId, ws);
                console.log(`Client registered with userId: ${userId}`);
                ws.userId = userId; // Attach userId to the ws object for later
                return;
            }

            // 2. Handle chat messages
            if (data.type === 'chat') {
                const { senderId, receiverId, content } = data;
                console.log(`Message from ${senderId} to ${receiverId}: ${content}`);

                // Persist message to DB via PHP API
                saveMessageToDb(senderId, receiverId, content);

                // Forward message to recipient if they are online
                const recipientWs = clients.get(receiverId);
                if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                    recipientWs.send(JSON.stringify({ type: 'chat', senderId, content }));
                }
            }
        } catch (error) {
            console.error('Failed to process message:', error);
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            clients.delete(ws.userId);
            console.log(`Client with userId: ${ws.userId} disconnected`);
        }
    });
});

function saveMessageToDb(senderId, receiverId, content) {
    const postData = JSON.stringify({ senderId, receiverId, content });
    const options = {
        hostname: 'localhost',
        port: 80, // Apache server port
        path: '/api/save_message.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    const req = http.request(options, res => {
        res.on('data', d => process.stdout.write(d));
    });

    req.on('error', error => console.error('Error saving message:', error));
    req.write(postData);
    req.end();
}