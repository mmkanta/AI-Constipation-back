const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        filepath: { type: String, required: true }
    },
    {
        timestamps: true
    }
);

const Image = db.model("images", schema);

module.exports = Image;