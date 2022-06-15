const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        fdisc: { type: String },
        sev3: { type: String },
        // fdiscxsev3: { type: String },
        dur3: { type: String },
        fstool: { type: String },
        incomplete: { type: String },
        strain: { type: String },
        hard: { type: String },
        block: { type: String },
        digit: { type: String },
        ppd: { type: String },
        sev9: { type: String },
        // ppdxsev9: { type: String },
        dur9: { type: String },
        scalesev: { type: String }
    },
    {
        timestamps: true
    }
);

const Questionaire = db.model("questionaires", schema);

module.exports = Questionaire;