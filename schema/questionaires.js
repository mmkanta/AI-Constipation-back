const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        fdisc: { type: Number },
        sev3: { type: Number },
        fdiscxsev3: { type: Number },
        dur3: { type: Number },
        fstool: { type: Number },
        incomplete: { type: Number },
        strain: { type: Number },
        hard: { type: Number },
        block: { type: Number },
        digit: { type: Number },
        ppd: { type: Number },
        sev9: { type: Number },
        ppdxsev9: { type: Number },
        dur9: { type: Number },
        scalesev: { type: Number }
    },
    {
        timestamps: true
    }
);

const Questionnaire = db.model("questionnaires", schema);

module.exports = Questionnaire;