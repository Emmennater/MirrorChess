
const SESSION_LIST_ID = "mirrorchess384";

class ChessSession {
    constructor() {
        // Switch to multiplayer
        gameEvents.waitForPlayer = true;
        
        // Session
        this.session = null;
    }
    
    static updateSessionLists(hostings) {
        // print("Hostings: ", hostings);
        MenuEvents.clearHosts();
        for (const host of hostings) {
            const hostName = host.hostName;
            const sessionId = host.id;
            MenuEvents.addNewHost(hostName, () => {
                ChessNetwork.connect(sessionId)
            });
        }
    }

    create(hostName, fen, turn) {
        // Random turn
        let hostsTurn = true;
        if (turn == "random") hostsTurn = Math.random() > 0.5;
        else hostsTurn = turn == "white";

        // Session details
        this.hostName = hostName;
        
        // Create session
        const sessionId = ChessNetwork.randomString();
        const session = { type: "session", id: sessionId, hostName, fen, hostsTurn };
        this.session = session;

        // Broadcast session
        Sockets.send("hosting", session);

        // Setup game
        this.setupGame(fen, hostsTurn);
    }

    connect(sessionId) {
        Sockets.request({ type: "join", sessionId }, (reply) => {
            if (typeof reply.data == "string") {
                this.leave();
                return console.error(reply.data);
            }
            this.session = reply.data;
            this.setupGame(this.session.fen, !this.session.hostsTurn);
        });
    }

    leave() {
        // Leave the session
        if (this.session != null)
            Sockets.send({ type: "leave", sessionId: this.session.id }, 0);
        gameEvents.waitForPlayer = false;
        gameEvents.session = null;
        this.session = null;
    }

    sendMove(data) {
        Sockets.send({ type: "move", sessionId: this.session.id }, data);
    }

    requestMove(callback) {
        Sockets.request({ type: "move", sessionId: this.session.id }, callback);
    }

    setupGame(fen, turn) {
        this.fen = fen;
        this.turn = turn;

        // Initialize new game
        game.newGame(fen);

        // Set game session
        gameEvents.session = this;

        // Request previously played moves
        Sockets.request({ type: "history", sessionId: this.session.id }, data => {
            // Play all the moves
            for (let move of data.data) {
                game.playMove(move.from, move.to, false, true);
            }
        });

        // Set turn
        gameEvents.waiting = !turn;

        // If we are waiting for the other player, put in a request
        if (!turn) {
            this.requestMove(data => {
                // print("received move: ", data);
                const movedata = data.data;
                game.playMove(movedata.from, movedata.to, true);
                gameEvents.waiting = false;
            });
        }
    }

    close() {
        this.leave();
        gameEvents.waiting = false;
        gameEvents.waitForPlayer = false;
        gameEvents.networkInterface = null;
        ChessNetwork.currentSession = null;
    }
}
