
class Host {
    constructor(hostId, sessionData, server) {
        // Server
        this.server = server;

        // Host information
        this.hostId = hostId;
        this.clientId = 0;
        this.sessionData = sessionData;
        this.lastMove = { ownerId: 0, move: 0, recipientCallback: null };
        this.moveHistory = [];
    }

    hostLeaving() {
        if (this.clientId == 0) return;

        // Notify the client that the host has left the session
        this.server.sendClient(this.clientId, "left", 0);
    }

    clientJoining(clientId) {
        this.clientId = clientId;

        // Notify the host that the client has joined the session
        this.server.sendClient(this.hostId, "joined", 0);
    }

    clientLeaving() {
        this.clientId = 0;

        // Notify the host that the client has left the session
        this.server.sendClient(this.hostId, "left", 0);
    }
}

class Databank {
    constructor() {
        this.server = null;
        this.hosts = new Map();
        this.data = {};
    }

    getAllSessions() {
        const sessions = [];

        for (const [key, host] of this.hosts.entries()) {
            const full = host.clientId != 0;
            if (full) continue;

            // Add available session to list
            sessions.push(host.sessionData);
        }

        return sessions;
    }

    broadcastSessionChanges(fromClient = null) {
        const sessions = this.getAllSessions();
        this.server.broadcast("hostings", sessions, fromClient);
    }

    put(what, data, client) {
        // Add new hosting
        if (what == "hosting") {
            const host = new Host(client.id, data, this.server);
            this.hosts.set(data.id, host);
            
            // Broadcast new hosting to all clients
            this.broadcastSessionChanges(null);
        }

        // Objects past this point
        if (typeof what != "object") return;

        if (what.type == "move") {
            // Update last move
            const host = this.hosts.get(what.sessionId);
            if (host == undefined) return;
            host.lastMove.ownerId = client.id;
            host.lastMove.move = data;

            // Update session turn
            host.sessionData.hostsTurn = !host.sessionData.hostsTurn;

            // Update move history
            host.moveHistory.push(data);

            // Update client with new move
            if (host.lastMove.recipientCallback != null) {
                host.lastMove.recipientCallback(data);
                host.lastMove.recipientCallback = null;
            }
        }

        if (what.type == "leave") {
            const host = this.hosts.get(what.sessionId);
            if (host == undefined) return;

            // console.log("player leaving", client.id, " host: ", host.hostId);

            // If this player was the host, then delete this session
            if (host.hostId == client.id) {
                host.hostLeaving();
                this.hosts.delete(what.sessionId);
                // console.log("deleted session!");
            } else {
                // Otherwise just kick the other player
                host.clientLeaving(client.id);
            }

            // Update available hosts (even the client who left)
            this.broadcastSessionChanges(null);
        }
    }

    get(what, client, callback) {
        // Retrieve all hosts
        if (what == "hosts") {
            const sessions = this.getAllSessions();
            return callback(sessions);
        }

        // Objects past this point
        if (typeof what != "object") return 0;

        // Client wants to join a session
        if (what.type == "join") {
            const host = this.hosts.get(what.sessionId);
            if (host == undefined) return callback("host not found");

            // If this client is the host, then deny it
            if (host.hostId == client.id) return callback("host cannot be a client");

            // Join this session
            host.clientJoining(client.id);

            // This session is now full (update all clients)
            this.broadcastSessionChanges(null);

            return callback(host.sessionData);
        }

        // Client wants the next move of a session
        if (what.type == "move") {
            this.getNextSessionMove(what.sessionId, client.id, callback);
        }

        // Client wants all the moves that have been previously made
        if (what.type == "history") {
            const host = this.hosts.get(what.sessionId);
            if (host == undefined) return 0;
            return callback(host.moveHistory);
        }

        return 0;
    }

    getNextSessionMove(sessionId, recipientId, callback) {
        // Get session
        const host = this.hosts.get(sessionId);
        if (host == undefined) return;
        
        // Check if move is already available
        // if (host.lastMove.ownerId && host.lastMove.ownerId != recipientId) {
        //     callback(host.lastMove.move);
        //     return;
        // }

        // Wait until move is ready to be returned
        host.lastMove.recipientCallback = callback;

    }

    removeClientData(client) {
        // Remove all data associated with this client (hostings)
        let hostsUpdated = false;
        for (let [key, host] of this.hosts.entries()) {
            // Remove hostings from this client
            if (host.hostId === client.id) {
                host.hostLeaving();
                this.hosts.delete(key);
                hostsUpdated = true;
            }

            // Leave any sessions this client is currently in
            if (host.clientId == client.id) {
                host.clientLeaving();
            }
        }

        if (hostsUpdated) {
            // Broadcast updated hosts to other clients
            this.broadcastSessionChanges(client);
        }
    }

    setServer(server) {
        this.server = server;
    }
}

module.exports = Databank;
