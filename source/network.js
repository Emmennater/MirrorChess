
class ChessPlayerNetwork {
    constructor(gun, sessionID) {
        this.gun = gun;
        this.sessionID = sessionID;
        this.playerID = ChessNetwork.randomString();
        
        // Now multiplayer
        gameEvents.waitForPlayer = true;
        gameEvents.networkInterface = this;
    }

    sendData(data) {
        this.gun.get('games').get(this.sessionID).put(data);
    }

    getData(callback) {
        this.gun.get('games').get(this.sessionID).on(callback);
    }

    sendNextMove(moveData) {
        const data = { type: "move", move: JSON.stringify(moveData), playerID: this.playerID };
        this.sendData(data);
    }

    requestNextMove(callback) {
        const _callback = async (data) => {
            if (data == undefined) {
                console.log("pending...");
                await sleep(1000);
                
                // Try again after a bit
                return this.getData(_callback);
            }

            if (data.type != "move") return;
            if (data.playerID == this.playerID) return;
            callback(JSON.parse(data.move));
        }
        
        this.getData(_callback);
    }
}

class ChessHost extends ChessPlayerNetwork {
    constructor(gun, sessionID) {
        super(gun, sessionID);
        this.playerID = "host_" + this.playerID;
    }
}

class ChessClient extends ChessPlayerNetwork {
    constructor(gun, sessionID) {
        super(gun, sessionID);
        this.playerID = "client_" + this.playerID;
    }
}

class ChessNetwork {
    static currentSession = null;

    static randomString() {
        return Math.random().toString(36).slice(2);
    }

    static host(hostName, fenString, turn) {
        const sessionID = this.randomString(); // Generate a unique session ID
        const gun = Gun(); // Initialize GunDB

        const playerNetworkInterface = new ChessHost(gun, sessionID);

        // Initialize session
        this.currentSession = new ChessSession(playerNetworkInterface);
        this.currentSession.create(hostName, fenString, turn);
    }

    static async connect(hostName) {
        // Retreive session
        this.currentSession = new ChessSession();
        this.currentSession.connect(hostName);
    }

    static submitHosting() {

    }

    static updateHosts() {

    }
}

async function testNetwork() {
    ChessNetwork.host("example", ChessGame.defaultFen, "white");
    await sleep(100);
    // ChessNetwork.connect("example");
}
