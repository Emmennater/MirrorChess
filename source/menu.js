
class MenuEvents {
    static menuWrapper = document.getElementById("menu-wrapper");        
    static settingsMenu = document.getElementById("settings-menu");
    static helpMenu = document.getElementById("help-menu");
    static menu = document.getElementById("main-menu");
    static soloMenu = document.getElementById("solo-menu");
    static joinMenu = document.getElementById("join-menu");
    static hostMenu = document.getElementById("host-menu");
    static menuOpen = false;
    static menusOpen = [];

    static closeCurrentMenu(remove = true) {
        if (this.menusOpen.length == 0) return;
        const menuClosed = this.menusOpen.back();
        if (remove) this.menusOpen.pop();
        switch (menuClosed) {
            case "settings": this.settingsMenu.style.display = "none"; break;
            case "help": this.helpMenu.style.display = "none"; break;
            case "main": this.menu.style.display = "none"; break;
        }
        if (this.menusOpen.length == 0) {
            this.menuWrapper.classList.remove("showing");
            gameEvents.busy = false;
            this.menuOpen = false;
        } else if (remove) {
            this.openCurrentMenu();
        }
    }

    static closeAllMenus() {
        this.closeCurrentMenu(false);
        this.menusOpen = [];
        this.menuWrapper.classList.remove("showing");
        gameEvents.busy = false;
        this.menuOpen = false;
    }

    static openCurrentMenu() {
        if (this.menusOpen.length == 0) return;
        const menuOpened = this.menusOpen.back();
        switch (menuOpened) {
        case "settings": this.settingsMenu.style.display = "flex"; break;
        case "help": this.helpMenu.style.display = "flex"; break;
        case "main": this.menu.style.display = "flex"; break;
        }
        if (this.menusOpen.length == 1) {
            this.menuWrapper.classList.add("showing");
            gameEvents.busy = true;
            this.menuOpen = true;
        }
    }

    static openSettingsMenu() {
        if (this.menusOpen.back() == "settings") return;
        this.closeCurrentMenu(false);
        this.menusOpen.push("settings");
        this.openCurrentMenu();
    }

    static openHelpMenu() {
        if (this.menusOpen.back() == "help") return;
        this.closeCurrentMenu(false);
        this.menusOpen.push("help");
        this.openCurrentMenu();
    }

    static openMenu() {
        if (this.menusOpen.back() == "main") return;
        this.closeCurrentMenu(false);
        this.menusOpen.push("main");
        this.openCurrentMenu();
    }

    static mainMenu() {
        this.soloMenu.style.display = "none";
        this.joinMenu.style.display = "none";
        this.hostMenu.style.display = "none";
        this.menu.style.display = "flex";
        this.menusOpen = ["main"];
    }

    static startSoloGame() {
        const fenInput = document.getElementById("solo-fen");
        const fenString = fenInput.value;

        // Close menus
        this.soloMenu.style.display = "none";
        this.closeAllMenus();

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
        this.closeAllMenus();

        // New game sound effect
        playSound("assets/game-start.mp3");

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
            // Join game sound effect
            playSound("assets/game-start.mp3");

            this.mainMenu();
            this.closeAllMenus();
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

    static toggleFocusMode() {
        if (focusModeEnabled) {
            // Disable
            const buttonText = document.getElementById("focus-state");
            buttonText.classList.remove("text-enabled");
            buttonText.innerText = "Disabled";
            disableFocusMode();
        } else {
            // Enable
            const buttonText = document.getElementById("focus-state");
            buttonText.classList.add("text-enabled");
            buttonText.innerText = "Enabled";
            enableFocusMode();
        }
    }
}

(function test() {
    // MenuEvents.addNewHost("Example", ()=>console.log("joining example session..."));
})();
