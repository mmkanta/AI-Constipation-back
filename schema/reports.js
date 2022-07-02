const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const db = require('../db/aiweb');

// const Mask = require('./masks');
// const PredClasses = require('./predClasses');
// const Gradcam = require('./gradcams')
// const Image = require('./images')
// const MedRecord = require('./medRecords')

const schema = new Schema(
    {
        question_id: { type: ObjectId, ref: "questionnaires" },
        personal_info_id: { type: ObjectId, ref: "personal_infos" },
        task: { type: String, required: true },
        status: { type: String },
        DD_probability: { type: Number },
        label: { type: String },
        final_diag: { type: [String] },
        ctt_result: { type: String },
        anorectal_structural_abnormality: { type: String },
        anorectal_structural_abnormality_note: { type: String },
        IBS: { type: Boolean },
        comorbidity: { type: String },
        comorbidity_note: { type: String },
        surgery: { type: Boolean },
        surgery_note: { type: String },
        comments: { type: String },
        created_by: { type: ObjectId, ref: "users", required: true },
        updated_by: { type: ObjectId, ref: "users" },
        gradcam_path: { type: String },
        original_path: { type: String },
    },
    {
        timestamps: true
    }
);

// schema.pre('findOneAndDelete', { document: false, query: true }, async function () {
//     // const session = await db.startSession()
//     // await session.withTransaction( async () => {
//     const rid = this.getQuery()['_id']
//     const result = await Report.findById(rid)

//     // delete associated result from model
//     await Gradcam.deleteMany({ result_id: rid })
//     await Mask.findOneAndDelete({ result_id: rid })
//     await PredClasses.findOneAndDelete({ result_id: rid })

//     // delete associated image and medical record
//     await Image.findByIdAndDelete(result.image_id)
//     await MedRecord.findByIdAndDelete(result.record_id)
//     // })
//     // session.endSession();
// })

const Report = db.model("reports", schema);

module.exports = Report;