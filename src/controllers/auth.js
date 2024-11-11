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
  const hashedRefreshToken = await bcrypt.hash(refreshToken, +process.env.SALT);
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
    const hashedPassword = await bcrypt.hash(password, +process.env.SALT);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword],
    );
    // const user = result.rows[0];
    const user = { id: '', username, password: hashedPassword };

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
