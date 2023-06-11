
const WebSocket = require('ws');

class Client {
    constructor(server, ws, id) {
        this.server = server;
        this.ws = ws;
        this.id = id;

        this.ws.on("message", (message) => this.onMessage(message));
        this.ws.on("close", () => this.onClose());
    }

    onMessage(message) {
        const json = JSON.parse(message.toString());
        if (!json) return;

        // console.log("Received message: ", json);
        
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
    }

    start() {
        console.log("starting server...");
        this.wss = new WebSocket.Server({
            port: 8082,
            hostname: '127.0.0.1'
        });
        this.wss.on('connection', (ws) => this.onConnection(ws));
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
