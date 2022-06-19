const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        fdisc: { type: Number, required: true },
        sev3: { type: Number, required: true },
        fdiscxsev3: { type: Number, required: true },
        dur3: { type: Number, required: true },
        fstool: { type: Number, required: true },
        incomplete: { type: Number, required: true },
        strain: { type: Number, required: true },
        hard: { type: Number, required: true },
        block: { type: Number, required: true },
        digit: { type: Number, required: true },
        ppd: { type: Number, required: true },
        sev9: { type: Number, required: true },
        ppdxsev9: { type: Number, required: true },
        dur9: { type: Number, required: true },
        scalesev: { type: Number, required: true }
    },
    {
        timestamps: true
    }
);

const Questionnaire = db.model("questionnaires", schema);

module.exports = Questionnaire;