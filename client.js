let args = process.argv.slice(2);

function exit(msg) {
  console.error(`Error: [ ${msg} ]`);
  process.exit();
}

if (args.length > 0 && args.length % 2 === 0) {
  var host,
      localHostUrl,
      requiredPort = null,
      tunnelHost;

  for (var i = 0; i < args.length; i += 2) {
    if (args[i] === '-h') {
      host = args[i + 1];
    } else if (args[i] === '-l') {
      localHostUrl = args[i + 1];
    } else if (args[i] === '-p') {
      requiredPort = args[i + 1];
    }
  }

  if (!host || !localHostUrl || !requiredPort) {
    exit("Invalid tunnel host or localHostUrl or port");
  }

  const io = require("socket.io-client"),
        ioClient = io.connect(host, {
    reconnect: true
  });

  ioClient.on("sendMeta", () => {
    ioClient.emit("tunnelUrl", {
      url: localHostUrl,
      port: requiredPort
    });
  });
  ioClient.on("tunnelPort", port => {
    var options = require('url').parse(host);

    tunnelHost = `${options.protocol + "//" + options.hostname + ":" + port}`;
    console.log(`Tunnel Started in ${options.protocol + "//" + options.hostname + ":" + port}`);
  });
  ioClient.on('error', req => {
    console.log('error');
  });
  ioClient.on('message', msg => {
    exit(msg);
  });
  ioClient.on('httpRequest', (req, callBack) => {
    var url = require('url'),
        http = require('http'),
        https = require('https'),
        options = {};

    var proxy = url.parse(localHostUrl);
    options.headers = req.headers;
    options.method = req.method;
    options.agent = req.agent ? req.agent : false;
    options.host = proxy.host;
    options.hostname = proxy.hostname;
    options.port = proxy.port;
    options.protocol = proxy.protocol;
    options.path = req.path;
    options.headers['host'] = options.host; // options.encoding = null;

    console.log(`==> Forward Tunneling complete to ${options.method} ${options.protocol + "//" + options.host}${req.path}`);
    var httpreq = (options.protocol == 'https:' ? https : http).request(options, res => {
      // res.setEncoding('utf8');
      var body = '';
      res.on('data', function (data) {
        for (var i = 0; i < data.length; i++) {
          body += String.fromCharCode(data[i]); // body+=data[i]
        }
      });
      res.on('end', function () {
        var tunnelResponse = {
          id: req.id,
          status: res.statusCode,
          headers: res.headers,
          body: body,
          method: req.method,
          url: localHostUrl + req.path
        };
        console.log(`<== Reverse Tunneling started to ${req.method} ${localHostUrl}${req.path} ${res.statusCode}`);

        if (tunnelResponse.headers['content-type'] && tunnelResponse.headers['content-type'].indexOf('text/html') !== -1) {
          tunnelResponse.body = tunnelResponse.body.replace(new RegExp(localHostUrl, 'g'), tunnelHost);
          tunnelResponse.headers['content-length'] = tunnelResponse.body.length;
        }

        if (callBack) {
          callBack(tunnelResponse);
        }
      });
    });
    httpreq.on('error', error => {
      ioClient.emit('httpResponse', {
        id: req.id,
        status: 503,
        body: JSON.stringify({
          status: "Tunnel Error",
          reason: error.reason
        }),
        headers: {
          "content-type": "application/json"
        }
      });
    });

    if (req.body) {
      httpreq.write(req.body);
    }

    httpreq.end();
  });
} else {
  exit("Invalid Arguments");
}