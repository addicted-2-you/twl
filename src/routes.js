const authController = require('./controllers/auth');

module.exports = (req, res) => {
  if (req.url === '/auth/signup' && req.method === 'POST') {
    return authController.signup(req, res);
  }

  if (req.url === '/auth/signin' && req.method === 'POST') {
    return authController.signin(req, res);
  }

  if (req.url === '/auth/refresh' && req.method === 'POST') {
    return authController.refresh(req, res);
  }

  if (req.url === '/auth/signout' && req.method === 'POST') {
    return authController.signout(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Route not found' }));
};
