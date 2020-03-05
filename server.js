let args = process.argv.slice(2)
function exit(msg) {
    console.error(`[${msg}]`)
    process.exit()
}
if (args.length % 2 === 0 && args.length < 5) {
    var IOPORT = null;
    var serverMaxCount = null
    var serverLiveCount = 0;
    if (args.length > 0) {
        for (var i = 0; i < args.length; i += 2) {
            if (args[i] === '-p') {
                IOPORT = args[i + 1]
            } else if (args[i] === '-t') {
                serverMaxCount = args[i + 1]
            } else {
                exit("Invalid Arguments")
            }
        }
    }
    !IOPORT && (IOPORT = 8000)
    !serverMaxCount && (serverMaxCount = 3)

    var createServer = (socket, httpPort) => {
        var httpserver = require('http').createServer((req, res) => {
            try {
                var body = null;
                req.on('data', chunk => {
                    body = chunk.toString();
                })
                req.on('end', () => {
                    var httpRequest = {
                        id: Date.now() + Math.random() + httpserver.address().port,
                        method: req.method,
                        path: req.url,
                        headers: req.headers,
                        body: body
                    }
                    socket.emit('httpRequest', httpRequest, tunnelRes => {
                        console.log(`<== Reverse Tunneling complete to ${tunnelRes.method} ${tunnelRes.url} ${tunnelRes.status}`);
                        tunnelRes.headers['access-control-allow-origin'] = '*';
                        res.writeHeader(tunnelRes.status, tunnelRes.headers);
                        // res.end(new Buffer(tunnelRes.body, "binary"))
                        res.end(Buffer.from(tunnelRes.body, "binary"))
                    })
                })
            } catch (err) {
                res.writeHeader(503, { "content-type": "application/json" });
                res.end(JSON.stringify({ status: "Internal Server error" }));
            }

        })
        httpserver.on("listening", function () {
            serverMap.set(socket, httpserver);
            reverseServerMap.set(httpserver, socket)
            serverLiveCount++;
            socket.emit('tunnelPort', httpserver.address().port)
            console.info(`$ Http Server Started in PORT [ ${httpserver.address().port} ]`)
        });
        httpserver.on('error', (e) => {
            console.log(typeof e)
            socket.emit('message', `Port ${httpPort} Already used`)
        })

        // httpserver.on('uncaughtException', function( err ) {
        //     console.error(err.stack);
        // });

        httpserver.listen(httpPort);
        return httpPort;

    }

    const
        io = require("socket.io"),
        server = io.listen(IOPORT);
    console.error(`Socket Server Listening at [ ${IOPORT} ]`)
    let
        serverMap = new Map(),
        reverseServerMap = new Map(),
        portMap = new Map();





    server.on("connection", (socket) => {
        socket.on("disconnect", () => {
            var httpserver = serverMap.get(socket);
            if (httpserver) {
                var port = httpserver.address().port
                portMap.delete(port);
                serverLiveCount--;
                httpserver.close(() => {
                    console.info(`$ Killed Http Server PORT [ ${port} ] and stopped tunneling`)
                    serverMap.delete(socket);
                    reverseServerMap.delete(httpserver)
                });
            }
        });

        socket.on('tunnelUrl', meta => {
            if (serverLiveCount < serverMaxCount) {
                var port = meta.port;
                // if (portMap.get(port)) {
                // socket.emit('message', `Port ${port} Already used`)
                // } else {
                port = createServer(socket, port)
                if (port) {
                    console.info(`$ Tunneling "${meta.url}" to ${socket.id} in ${port}`);
                    portMap.set(port, true);
                }
                // }
            } else {
                socket.emit('message', "Tunnel Server Limit reached")
            }
        });
        socket.emit('sendMeta')
    });

    server.on('listening', s => {
        console.log('h')
    })
} else {
    exit("Invalid Arguments")
}