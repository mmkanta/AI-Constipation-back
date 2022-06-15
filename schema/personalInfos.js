const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        hospital: { type: String },
        hn: { type: String },
        name: { type: String },
        gender: { type: String },
        age: { type: Number }
    },
    {
        timestamps: true
    }
);

const PredClass = db.model("pred_classes", schema);

module.exports = PredClass;