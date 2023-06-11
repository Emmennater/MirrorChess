
class Sockets {
    static ws = null;
    static open = false;
    static outgoingRequests = new Map();

    static establishConnection() {
        const isLocal = window.location.hostname == "localhost" || window.location.hostname == "127.0.0.1";
        const hostname = isLocal ? "localhost" : "131.93.29.118";
        const port = 8082;
        this.ws = new WebSocket(`ws://${hostname}:${port}`);

        this.ws.addEventListener("open", conn => {
            this.open = true;
            MenuEvents.serverIsOnline();
            console.log("connected");
            
            // Get hosts from server
            Sockets.request("hosts", (reply) => {
                ChessSession.updateSessionLists(reply.data);
            });
        });

        this.ws.addEventListener("message", (event) => {
            const json = JSON.parse(event.data);
            if (!json) return;
            // console.log("Received message:", json);

            // Receive reply from outgoing requests
            if (json.type == "reply") {
                const callback = this.outgoingRequests.get(json.id);
                if (!callback) return;
                callback(json);
                this.outgoingRequests.delete(json.id);
            }

            // Receive broadcast
            if (json.type == "broadcast") {
                // Update hostings list
                if (json.what == "hostings") {
                    ChessSession.updateSessionLists(json.data);
                }
            }

            if (json.type == "put") {
                if (json.what == "joined") {
                    // A client joined the session
                    print("player joined");
                }

                if (json.what == "left") {
                    print("player left");
                }
            }
        });

        this.ws.addEventListener("close", () => {
            this.open = false;
            MenuEvents.serverIsOffline();
            console.log("Connection closed");
        });
    }

    static request(what, callback) {
        if (!this.open) return false;
        
        // Create the packet
        const packetId = ChessNetwork.randomString();
        const packet = {
            type: "get",
            what: what,
            id: packetId
        };

        // Get ready for a reply
        this.outgoingRequests.set(packetId, callback);

        // Send the packet
        this.ws.send(JSON.stringify(packet));
        return true;
    }

    static send(what, data) {
        if (!this.open) return false;

        const packet = {
            type: "put",
            what: what,
            data: data
        };

        this.ws.send(JSON.stringify(packet));
        return true;
    }
}

class ChessNetwork {
    static currentSession = null;

    static randomString() {
        return Math.random().toString(36).slice(2);
    }

    static host(hostName, fenString, turn) {
        // Hosting is only possible if we are connected to the server
        if (!Sockets.open) return;

        // Leave session if we are currently in one
        if (this.currentSession != null)
            this.currentSession.leave();

        // Initialize session
        this.currentSession = new ChessSession();
        this.currentSession.create(hostName, fenString, turn);
    }

    static connect(sessionId) {
        // Joining is only possible if we are connected to the server
        if (!Sockets.open) return;

        // Leave session if we are currently in one
        if (this.currentSession != null)
            this.currentSession.leave();

        // Retreive session
        this.currentSession = new ChessSession();
        this.currentSession.connect(sessionId);
    }
}

async function testNetwork() {
    // await sleep(100);
    // ChessNetwork.host("example", ChessGame.defaultFen, "white");

    // await sleep(100);
    // ChessNetwork.connect("example");
}
