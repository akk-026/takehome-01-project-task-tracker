const http = require('node:http');
const path = require('node:path');
const { createApp } = require('./app');

const port = Number(process.env.PORT || 3000);
const server = http.createServer(createApp({ dataFile: process.env.DATA_FILE, publicDirectory: path.join(__dirname, '..', 'public') }));

server.listen(port, () => {
  console.log(`Northstar is running at http://localhost:${port}`);
});
