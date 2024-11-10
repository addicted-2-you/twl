const { parseBody } = require('../utils/network');

exports.signup = async (req, res) => {
  const data = await parseBody(req);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'User signed up', data }));
};

exports.signin = async (req, res) => {
  const data = await parseBody(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'User signed in', data }));
};
