const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        DistFreq: { type: Number, required: true },
        DistSev: { type: Number, required: true },
        DistSevFreq: { type: Number, required: true },
        DistDur: { type: Number, required: true },
        FreqStool: { type: Number, required: true },
        Incomplete: { type: Number, required: true },
        Strain: { type: Number, required: true },
        Hard: { type: Number, required: true },
        Block: { type: Number, required: true },
        Digit: { type: Number, required: true },
        BloatFreq: { type: Number, required: true },
        BloatSev: { type: Number, required: true },
        BloatSevFreq: { type: Number, required: true },
        BloatDur: { type: Number, required: true },
        SevScale: { type: Number, required: true }
    },
    {
        timestamps: true
    }
);

const Questionnaire = db.model("questionnaires", schema);

module.exports = Questionnaire;