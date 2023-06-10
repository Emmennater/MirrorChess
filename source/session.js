
const SESSION_LIST_ID = "mirrorchess384";

class ChessSession {
    static _gun = new Gun();

    constructor(playerNetworkInterface) {
        this.playerNetworkInterface = playerNetworkInterface;
    }
    
    static async updateSessionLists() {
        this._gun.get('games').get(SESSION_LIST_ID).on(async (data) => {
            if (data.type != "session") return;
            // print("session found", data.hostName);
            
            MenuEvents.clearHosts();
            MenuEvents.addNewHost(data.hostName, ()=>{
                ChessNetwork.connect(data.hostName);
            });
        });

        await sleep(3000); // Every 3 seconds
        this.updateSessionLists();
    }

    create(hostName, fen, turn) {
        // Random turn
        if (turn == "random") turn = (Math.random() > 0.5) ? "black" : "white";

        // Session details
        this.hostName = hostName;
        const opponentsTurn = (turn == "white") ? "black" : "white";

        // Create session
        const session = { type: "session", hostName, fen, turn: opponentsTurn, sessionID: this.playerNetworkInterface.sessionID };

        // Broadcast session
        ChessSession._gun.get('games').get(SESSION_LIST_ID).put(session);

        // print("broadcasted session", session);

        // Setup game
        this.setupGame(fen, turn);
    }

    connect(hostName) {
        this.hostName = hostName;

        // Locate session
        ChessSession._gun.get('games').get(SESSION_LIST_ID).on(data => {
            if (data.type != "session") return;
            
            const gun = Gun(); // Initialize GunDB
            this.playerNetworkInterface = new ChessClient(gun, data.sessionID);

            // Setup game
            this.setupGame(data.fen, data.turn);
        });
    }

    setupGame(fen, turn) {
        this.fen = fen;
        this.turn = turn;

        // Initialize new game
        game.newGame(fen);

        // Set turn
        if (turn == "black") gameEvents.waiting = true;
    }

    close() {
        gameEvents.waiting = false;
        gameEvents.waitForPlayer = false;
        gameEvents.networkInterface = null;
        ChessNetwork.currentSession = null;
    }
}
