
const server = require('./server.js');
const Databank = require('./data.js');

(function startServer() {
    const databank = new Databank();
    const myServer = new server.Server(databank);
    myServer.start();
})();
