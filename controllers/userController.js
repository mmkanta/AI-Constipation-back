const bcrypt = require("bcryptjs");
const Joi = require("joi");
const webModel = require("../schema");
const { userStatus, userRole } = require("../utils/status");

// create data validator for input
const schema = {
    username: Joi.string().max(32).required(),
    password: Joi.string().required().min(8).max(32),
    // password2: Joi.string().required().min(8).max(32),
    first_name: Joi.string().required().max(32),
    last_name: Joi.string().required().max(32),
    role: Joi.string()
        .valid(userRole.ADMIN, userRole.GENERAL, userRole.CLINICIAN)
        .required(),
    email: Joi.string().required().email(),
};

const updateSchema = {
    id: Joi.string().required(),
    password: Joi.string().min(8).max(32),
    first_name: Joi.string().max(32),
    last_name: Joi.string().max(32),
    role: Joi.string()
        .valid(userRole.ADMIN, userRole.GENERAL, userRole.CLINICIAN),
    email: Joi.string().email(),
};

const validator = Joi.object(schema);
const updateValidator = Joi.object(updateSchema);

const salt = 10;

// create new user
const create = async (req, res) => {
    // validate input (req.body)
    const validatedResult = validator.validate(req.body);
    if (validatedResult.error) {
        return res
            .status(400)
            .json({
                success: false,
                message: `Invalid input: ${validatedResult.error.message}`,
            });
    }
    try {
        // hash password
        const passwordHash = await bcrypt.hash(req.body.password, salt);

        delete req.body.password;
        // insert data to users collection
        const user = await webModel.User.create({
            ...req.body,
            password: passwordHash,
            token: [],
            status: userStatus.ACTIVE,
        });

        // send status and message
        return res.status(200).json({
            success: true,
            message: "Create user successfully",
            data: {
                user_id: user._id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                status: userStatus.ACTIVE,
            },
        });
    } catch (e) {
        // if username is duplicate
        if (e.message.includes("duplicate key")) {
            return res
                .status(400)
                .json({ success: false, message: "Duplicate username" });
        }

        // other error
        return res
            .status(500)
            .json({
                success: false,
                message: "Internal server error",
                error: e.message,
            });
    }
};

// get all users
const getAll = async (req, res) => {
    try {
        // Find all user from users collection
        const user = await webModel.User.find({ status: userStatus.ACTIVE }).select(
            [
                "_id",
                "username",
                "first_name",
                "last_name",
                "role",
                "email",
            ]
        );

        // send status and message
        return res
            .status(200)
            .json({
                success: true,
                message: "Get all users successfully",
                data: user,
            });
    } catch (e) {
        // if error, send status and message
        return res
            .status(500)
            .json({
                success: false,
                message: "Internal server error",
                error: e.message,
            });
    }
};

// get user by id
const getById = async (req, res) => {
    try {
        const user = await webModel.User.findById(req.params.user_id, [
            "_id",
            "username",
            "first_name",
            "last_name",
            "role",
            "email",
        ]);

        if (!user)
            return res
            .status(400)
            .json({
                success: true,
                message: "User not found"
            });
        return res
            .status(200)
            .json({
                success: true,
                message: "Get users successfully",
                data: user,
            });
    } catch (e) {
        return res
            .status(500)
            .json({
                success: false,
                message: "Internal server error",
                error: e.message,
            });
    }
};

// update user by id
const update = async (req, res) => {
    const validatedResult = updateValidator.validate(req.body);
    if (validatedResult.error) {
        return res
            .status(400)
            .json({
                success: false,
                message: `Invalid input: ${validatedResult.error.message}`,
            });
    }
    try {
        // hash password
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, salt);
            req.body.token = []
        }

        if (req.user.role !== userRole.ADMIN) delete req.body.role;

        const user = await webModel.User.findOneAndUpdate(
            {
                _id: req.body.id,
                status: userStatus.ACTIVE,
            },
            req.body
        );
        if (!user)
            return res
                .status(400)
                .json({ success: false, message: `User ${req.body.id} not found` });

        // send status and message
        return res.status(200).json({
            success: true,
            message: "Update user successfully",
            data: {
                user_id: user._id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                status: user.status,
            },
        });
    } catch (e) {
        return res
            .status(500)
            .json({
                success: false,
                message: "Internal server error",
                error: e.message,
            });
    }
};

const deleteById = async (req, res) => {
    try {
        const user = await webModel.User.findOneAndUpdate(
            { _id: req.params.user_id },
            { status: userStatus.INACTIVE },
            { new: true }
        );
        if (!user)
            return res
                .status(400)
                .json({ success: false, message: `User ${req.params.user_id} not found` });

        // send status and message
        return res.status(200).json({
            success: true,
            message: `Delete user ${user._id} successfully.`,
        });
    } catch (e) {
        return res
            .status(500)
            .json({
                success: false,
                message: "Internal server error",
                error: e.message,
            });
    }
};

module.exports = {
    create,
    getAll,
    getById,
    update,
    deleteById,
};
