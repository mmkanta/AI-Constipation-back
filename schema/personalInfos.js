const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        hospital: { type: String, required: true },
        hn: { type: String, required: true },
        name: { type: String, required: true },
        gender: { type: String, required: true },
        age: { type: Number, required: true }
    },
    {
        timestamps: true
    }
);

const PersonalInfo = db.model("personal_infos", schema);

module.exports = PersonalInfo;