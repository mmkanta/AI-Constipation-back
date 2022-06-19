const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const webModel = require('../schema')
const { userStatus } = require('../utils/status')

dotenv.config();

const secret = process.env.SECRET_TOKEN;

const verifyToken = async (req, res, next) => {
    // get token from header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    // if no token, send error message
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token not found in the header' });
    }

    // check if token is not expired
    jwt.verify(token, secret, async (err, user) => {
        // check if user still login
        const result = await webModel.User.findOne({ token: token });
        if (err || !result) {
            if (err && result) {
                await webModel.User.findOneAndUpdate({ token: token }, {
                    $pullAll: { token: [token] }
                })
            }
            return res.status(401).json({ success: false, message: 'Token is invalid, please login again' });
        }

        if (result.status !== userStatus.ACTIVE)
            return res.status(403).json({ success: false, message: `User have no permission to access the resource` })
        req.user = user;
        next();
    })
}

module.exports = verifyToken;