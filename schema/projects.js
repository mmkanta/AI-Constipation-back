const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const db = require('../db/aiweb')

const schema = new Schema(
    {
        task: { type: String, required: true },
        // description: { type: String },
        // predClasses: [{ type: String }]
    },
    {
        timestamps: true
    }

);

// import webapp database
// schema for projects collection
const Project = db.model("projects", schema);

module.exports = Project;