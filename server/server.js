
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');

const HEARTBEAT_INTERVAL = 30000; // ms between pings, well under ngrok's idle timeout

// Maybe add a ban list to users who try to "hack" the system
// by sending bad data
class Client {
    constructor(server, ws, id) {
        this.server = server;
        this.ws = ws;
        this.id = id;
        this.isAlive = true; // answered the last heartbeat ping

        this.ws.on("pong", () => this.isAlive = true);
        this.ws.on("message", (message) => this.onMessage(message));
        this.ws.on("close", () => this.onClose());
    }

    onMessage(message) {
        let json;
        try {
            json = JSON.parse(message.toString());
        } catch (error) {
            return;
        }
        if (!json) return;

        // console.log("Received message: ", json);
        
        try {
            if (json.type == "put") this.server.databank.put(json.what, json.data, this);
            if (json.type == "get") {
                this.server.databank.get(json.what, this, (data) => {
                    const packet = {
                        type: "reply",
                        data: data,
                        id: json.id
                    };
                    this.ws.send(JSON.stringify(packet));
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    onClose() {
        console.log("Client disconnected: ", this.id);
        this.server.databank.removeClientData(this);
        this.server.removeClient(this);
    }
}

class Server {
    constructor(databank) {
        this.clients = new Map();
        this.databank = databank;
        this.databank.setServer(this);
        this.port = 8082;
        this.heartbeat = null;
    }

    start() {
        console.log("starting server...");
        this.wss = new WebSocket.Server({
            port: this.port,
            hostname: '127.0.0.1'
        });
        this.wss.on('listening', () => console.log(`server listening on port ${this.port}`));
        this.wss.on('error', (error) => console.log(error));
        this.wss.on('close', () => this.onClose());
        this.wss.on('connection', (ws) => this.onConnection(ws));
        this.heartbeat = setInterval(() => this.pingClients(), HEARTBEAT_INTERVAL);
    }

    /**
     * Ping every client so idle connections keep sending traffic through ngrok,
     * and drop clients that did not answer the previous ping
     */
    pingClients() {
        for (const client of this.clients.values()) {
            // No pong since the last ping, so the connection is dead
            if (!client.isAlive) {
                console.log("Client timed out: ", client.id);
                client.ws.terminate();
                continue;
            }

            client.isAlive = false;
            client.ws.ping();
        }
    }

    onClose() {
        clearInterval(this.heartbeat);
        console.log("server closed");
    }

    onConnection(ws) {
        const clientId = randomString();
        console.log("Client connected: ", clientId);
        const client = new Client(this, ws, clientId);
        this.clients.set(clientId, client);
    }

    removeClient(client) {
        // console.log("client removed!");
        this.clients.delete(client.id);
        // console.log("client list size: ", this.clients.size);
    }

    sendClient(clientId, what, data) {
        // Find the client
        const client = this.clients.get(clientId);
        if (client == undefined) return;

        // Build the packet
        const packet = {
            type: "put",
            what: what,
            data: data,
            id: randomString()
        };

        // Send the packet to the client
        client.ws.send(JSON.stringify(packet));
    }

    broadcast(what, data, sender) {
        const packet = {
            type: "broadcast",
            what: what,
            data: data,
            id: randomString()
        };
        for (const [clientId, client] of this.clients) {
            // Skip broadcasting to the sender client
            if (sender != null && clientId === sender.id) continue;
            client.ws.send(JSON.stringify(packet));
        }
    }
}

function randomString() {
    return Math.random().toString(36).slice(2);
}

module.exports = {
    Client,
    Server,
    randomString
};
