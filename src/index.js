require('dotenv').config();

const http = require('node:http');

const routes = require('./routes');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  routes(req, res);
});

server.listen(process.env.NODE_PORT, () => {
  console.log(`server is running on the ${process.env.NODE_PORT}...`);
});
