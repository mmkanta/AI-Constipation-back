const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        username: { type: String, required: true, unique: true, index: true },
        password: { type: String, required: true },
        email: { type: String, required: true },
        first_name: { type: String, required: true },
        last_name: { type: String, required: true },
        role: { type: String, required: true },
        token: { type: [String], required: true },
        status: { type: String, required: true },
        hospital: { type: String, required: true },
    },
    {
        timestamps: true
    }

);

// import webapp database
// schema for users collection
const User = db.model("users", schema);

module.exports = User;