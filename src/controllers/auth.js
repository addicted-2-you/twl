const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const db = require('../db');

const { parseBody } = require('../utils/network');

const generateTokens = async (userId, username) => {
  const [accessToken, refreshToken] = await Promise.all([
    jwt.sign(
      {
        sub: userId,
        username,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    ),
    jwt.sign(
      {
        sub: userId,
        username,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    ),
  ]);

  return {
    accessToken,
    refreshToken,
  };
};

const updateRefreshToken = async (userId, refreshToken) => {
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await db.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [
    hashedRefreshToken,
    userId,
  ]);
};

exports.signup = async (req, res) => {
  try {
    const data = await parseBody(req);
    const { username, password } = data;

    // Check if user exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );

    if (existingUser.rows.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Username already exists' }));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword],
    );
    const user = result.rows[0];

    // Generate tokens
    const tokens = await generateTokens(user.id, user.username);

    // Save refresh token
    await updateRefreshToken(user.id, tokens.refreshToken);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User signed up successfully', tokens }));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
};

exports.signin = async (req, res) => {
  try {
    const data = await parseBody(req);
    const { username, password } = data;

    // Find user
    const result = await db.query('SELECT * FROM users WHERE username = $1', [
      username,
    ]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Invalid credentials' }));
    }

    // Generate tokens
    const tokens = await generateTokens(user.id, user.username);

    // Save refresh token
    await updateRefreshToken(user.id, tokens.refreshToken);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User signed in successfully', tokens }));
  } catch (error) {
    console.log(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
};

exports.signout = async (req, res) => {
  try {
    const data = await parseBody(req);
    const { refreshToken } = data;

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await db.query(
      'UPDATE users SET refresh_token = NULL WHERE refresh_token = $1',
      [hashedRefreshToken],
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User signed out successfully' }));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
};

exports.refresh = async (req, res) => {
  try {
    const data = await parseBody(req);
    const { refreshToken } = data;

    // Verify refresh token
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const result = await db.query('SELECT * FROM users WHERE id = $1', [
      payload.sub,
    ]);
    const user = result.rows[0];

    if (!user || !user.refresh_token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Unauthorized' }));
    }

    // Verify refresh token hash
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refresh_token,
    );

    if (!refreshTokenMatches) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Unauthorized' }));
    }

    // Generate new tokens
    const tokens = await generateTokens(user.id, user.username);

    // Save new refresh token
    await updateRefreshToken(user.id, tokens.refreshToken);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ message: 'Tokens refreshed successfully', tokens }),
    );
  } catch (error) {
    console.error(error);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Unauthorized' }));
  }
};
