const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const db = require('../db/aiweb')

const path = require('path');
const fs = require('fs')

const schema = new Schema(
    {
        result_id: { type: ObjectId, ref: "reports" },
        finding: { type: String },
        gradcam_path: {type: String}
    },
    {
        timestamps: true
    }
);

// schema.pre('deleteMany', { document: false, query: true }, async function () {
//     const rid = this._conditions['result_id']
//     const gradcam = await Gradcam.findOne({result_id: rid})

//     // delete report's gradcam directory if exist
//     if (gradcam) {
//         let dir = gradcam['gradcam_path'].split('/')
//         dir.pop()
//         dir = dir.join('/')
//         const resultDir = path.join(__dirname, "../../resources", dir)
        
//         if (fs.existsSync(resultDir)) {
//             await fs.promises.rm(resultDir, { recursive: true, force: true });
//         }
//     }
// })

// schema.pre('findOneAndDelete', { document: false, query: true }, async function () {
//     const gid = this.getQuery()['_id']
//     const gradcam = await Gradcam.findOne({_id: gid})

//     if (gradcam) {
//         let dir = gradcam['gradcam_path']
//         const resultLoc = path.join(__dirname, "../../resources", dir)
        
//         if (fs.existsSync(resultLoc)) {
//             await fs.promises.unlink(resultLoc)
//         }
//     }
// })

const Gradcam = db.model("gradcams", schema);

module.exports = Gradcam;