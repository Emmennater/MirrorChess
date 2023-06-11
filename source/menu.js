
class MenuEvents {
    static menuWrapper = document.getElementById("menu-wrapper");        
    static helpMenu = document.getElementById("help-menu");
    static menu = document.getElementById("main-menu");
    static soloMenu = document.getElementById("solo-menu");
    static joinMenu = document.getElementById("join-menu");
    static hostMenu = document.getElementById("host-menu");
    static menuOpen = false;

    static openHelpMenu() {
        this.menu.style.display = "none";
        this.menuWrapper.classList.add("showing");
        this.helpMenu.style.display = "flex";
        gameEvents.busy = true;
    }

    static closeHelpMenu() {
        this.helpMenu.style.display = "none";

        if (this.menuOpen) {
            this.menu.style.display = "flex";
            return;
        }

        this.menuWrapper.classList.remove("showing");
        gameEvents.busy = false;
    }

    static openMenu() {
        if (this.menuOpen) return;
        this.menuOpen = true;
        this.menuWrapper.classList.add("showing");
        this.menu.style.display = "flex";
        gameEvents.busy = true;
    }

    static closeMenu() {
        this.menuOpen = false;
        this.menuWrapper.classList.remove("showing");
        this.menu.style.display = "none";
        gameEvents.busy = false;
    }

    static mainMenu() {
        this.soloMenu.style.display = "none";
        this.joinMenu.style.display = "none";
        this.hostMenu.style.display = "none";
        this.menu.style.display = "flex";
    }

    static startSoloGame() {
        const fenInput = document.getElementById("solo-fen");
        const fenString = fenInput.value;

        // Close menus
        this.soloMenu.style.display = "none";
        this.closeMenu();

        // Stop multiplayer if not already
        if (ChessNetwork.currentSession != null)
            ChessNetwork.currentSession.close();

        // New game sound effect
        playSound("assets/game-start.mp3");

        // Initialize new game
        game.newGame(fenString);
    }

    static soloGame() {
        this.menu.style.display = "none";
        this.soloMenu.style.display = "flex";

        // Reset settings
        const fenInput = document.getElementById("solo-fen");
        fenInput.value = "8/8/pppppppp/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR/PPPPPPPP/8/8";
    }

    static joinGame() {
        this.menu.style.display = "none";
        this.joinMenu.style.display = "flex";
    }

    static hostGame() {
        this.menu.style.display = "none";
        this.hostMenu.style.display = "flex";

        // Reset settings
        const nameInput = document.getElementById("host-name");
        const fenInput = document.getElementById("host-fen");
        const sideInput = document.getElementById("host-side");
        nameInput.value = "";
        fenInput.value = "8/8/pppppppp/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR/PPPPPPPP/8/8";
        sideInput.value = "white";
        nameInput.classList.remove("error-flag");
    }

    static submitHosting() {
        // Fetch settings
        const nameInput = document.getElementById("host-name");
        const fenInput = document.getElementById("host-fen");
        const sideInput = document.getElementById("host-side");
        const hostName = nameInput.value;
        const fenString = fenInput.value;
        const side = sideInput.value;

        // Flag empty host names
        if (hostName == "") {
            nameInput.classList.add("error-flag");
            return;
        }

        // Close menus
        this.mainMenu();
        this.closeMenu();

        // Create session
        ChessNetwork.host(hostName, fenString, side);
    }

    static clearHosts() {
        const hosts = document.getElementById("hosts");
        hosts.innerHTML = '';
    }

    static addNewHost(name, callback) {
        const hosts = document.getElementById("hosts");
        const host = document.createElement("div");
        host.classList.add("host");
        const button = document.createElement("button");
        button.classList.add("host-button");
        button.innerText = name;
        button.onclick = () => {
            this.mainMenu();
            this.closeMenu();
            callback();
        }
        host.appendChild(button);
        hosts.appendChild(host);
    }

    static serverIsOnline() {
        const serverText = document.getElementById("is-online");
        serverText.innerText = "Server Online";
        serverText.classList.add("online");

        const joinButton = document.getElementById("join-button");
        const hostButton = document.getElementById("host-button");
        joinButton.classList.remove("button-disabled");
        hostButton.classList.remove("button-disabled");
    }

    static serverIsOffline() {
        const serverText = document.getElementById("is-online");
        serverText.innerText = "Server Offline";
        serverText.classList.remove("online");

        const joinButton = document.getElementById("join-button");
        const hostButton = document.getElementById("host-button");
        joinButton.classList.add("button-disabled");
        hostButton.classList.add("button-disabled");
    }
}

(function test() {
    // MenuEvents.addNewHost("Example", ()=>console.log("joining example session..."));
})();
