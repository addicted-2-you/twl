const authController = require('./controllers/auth');

module.exports = (req, res) => {
  if (req.url === '/auth/signup' && req.method === 'POST') {
    return authController.signup(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Route not found' }));
};
