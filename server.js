const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const { wsManager } = require('./lib/websocket/server.js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Приложение Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  wsManager.init(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Server listening at http://${hostname}:${port}`);
    console.log(`> WebSocket server initialized`);
  });
});