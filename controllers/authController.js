const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const tokenGenerator = require('../middlewares/tokenGenerator');
const webModel = require('../schema')
const { userStatus } = require('../utils/status')

dotenv.config();

const login = async (req, res) => {
    try {
        // check if username is in the database
        const user = await webModel.User.findOne({ username: req.body.username });
        if (!user || user.status !== userStatus.ACTIVE) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        // check if password is correct
        const result = await bcrypt.compare(req.body.password, user.password);
        if (!result) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        // generate jwt token
        const data = tokenGenerator({
            _id: user._id,
            username: req.body.username,
            first_name: user.first_name, 
            role: user.role
        }, req.body.remember ? true : false);

        // store token in database
        await webModel.User.findByIdAndUpdate(user._id, {
            $push: { token: data }
        })
        return res.status(200).json({
            success: true,
            message: `Login successfully`,
            data: {
                user_id: user._id,
                username: user.username,
                first_name: user.first_name, 
                role: user.role,
                token: data
            }
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

const logout = async (req, res) => {
    try {
        // update token to be empty
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        await webModel.User.findByIdAndUpdate(req.user._id, {
            $pullAll: { token: [token] }
        })
        return res.status(200).json({ success: true, message: `User ${req.user._id} logout successfully` })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

module.exports = {
    login,
    logout
}