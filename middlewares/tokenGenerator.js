const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const secret = process.env.SECRET_TOKEN;

const generateToken = (data, remember) => {
  // generate jwt token when user login
  return jwt.sign(data, secret, {
    expiresIn: remember ? "180d" : "24h",
    algorithm: 'HS256'
  });
}

module.exports = generateToken;