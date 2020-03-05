# intranet-reverse-proxy
Tunneling Server for reverse proxy in intranet. 
Private localhost can be exposed in intranet via proxy server

## Requirement
1. Host connected in intranet network
2. Private localhost

## Usage
Install the module in host and localhost
1. Start the tunnel server at a host(connected to intranet)
	 >$ node server.js -p {socket server port} -t {maximum tunnels}
2. Start the tunnel client at localhost
	 >$ node client.js -h {host-url-with-port} -l {localhost-url-with-port} -p {tunnelling-server-port}

Once the client is connected successfully, Tunnel URL will be printed in client, which can be used to access the localhost over intranet

Each client can start a tunneling server over HTTP until the tunnel limit set by server is reached
