const webModel = require('../schema')
const path = require('path');
const fs = require('fs')
const { generateShortId } = require('../utils/reusableFunction');
const { modelStatus } = require('../utils/status')
const Joi = require('joi');

const root = path.join(__dirname, "..");

const updateSchema = {
    report_id: Joi.string().required(),
    // user_id: Joi.string().required(),
    label: Joi.string().valid("DD", "non-DD"),
    final_diag: Joi.array().items(Joi.string().valid("symptoms", "manometry", "BET", "defecography", "CTT")).max(5),
    ctt_result: Joi.string().valid("delayed", "normal", "not done"),
    anorectal_structural_abnormality: Joi.string().valid("no", "rectocele", "intussusception", "not assess"),
    IBS: Joi.boolean(),
    cormorbidity: Joi.string().max(100),
    surgical_history: Joi.boolean(),
    surgical_history_note: Joi.string().max(50),
    comments: Joi.string().max(100),
};

const updateValidator = Joi.object(updateSchema);

// get image by accession_no (PACS) or by predicted result id + finding's name (overlay image)
const getImage = async (req, res) => {
    try {
        const report = await webModel.Report.findById(req.query.report_id)
        if (!report) return res.status(400).json({ success: false, message: 'Image not found' })

        if (req.query.finding == "original" && report.original_path) {
            const originalPath = path.join(root, report.original_path)
            if (fs.existsSync(originalPath)) return res.status(200).sendFile(originalPath)
        }

        if (req.query.finding == "gradcam" && report.gradcam_path) {
            const gradcamPath = path.join(root, report.gradcam_path)
            if (fs.existsSync(gradcamPath)) return res.status(200).sendFile(gradcamPath)
        }

        return res.status(400).json({ success: false, message: 'Image not found' })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

const viewResult = async (req, res) => {
    try {
        let reports = await webModel.Report.find()
            .select([
                "status",
                "personal_info_id",
                "created_by",
                "label",
                "createdAt",
                "_id",
                "DD_probability"
            ])
            .populate("personal_info_id", ["hn", "name", "DD_confidence", "hospital"])
            .populate("created_by", ["username"])

        reports = reports.map((report, idx) => {
            const prediction = report.DD_probability
                ? report.DD_probability >= 0.5 ? "DD" : "non-DD"
                : "-"
            return {
                _id: report._id,
                index: generateShortId(report.id),
                status: report.status,
                HN: report.personal_info_id.hn,
                name: report.personal_info_id.name,
                label: report.label,
                prediction,
                evaluation: report.label == prediction ? true : false,
                date: report.createdAt,
                clinician: report.created_by.username,
                hospital: report.personal_info_id.hospital,
                DD_confidence: report.personal_info_id.DD_confidence
            }
        })

        return res.status(200).json({
            success: true,
            message: `Get reports successfully`,
            data: reports
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

const getById = async (req, res) => {
    try {
        let report = await webModel.Report.findById(req.params.report_id)
            .populate("personal_info_id")
            .populate("question_id")
            .populate("created_by", ["username", "first_name", "last_name"])
            .populate("updated_by", ["username", "first_name", "last_name"])

        if (!report)
            return res.status(400).json({ success: false, message: 'Report not found' })

        data = report.toObject()
        data.index = generateShortId(report.id)

        if (data.question_id) {
            delete data.question_id.createdAt
            delete data.question_id.updatedAt
            delete data.question_id.__v
        }

        delete data.personal_info_id.createdAt
        delete data.personal_info_id.updatedAt
        delete data.personal_info_id.__v

        delete data.gradcam_path
        delete data.original_path

        return res.status(200).json({
            success: true,
            message: `Get report successfully`,
            data
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

const update = async (req, res) => {
    const validatedResult = updateValidator.validate(req.body);
    if (validatedResult.error) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: ${validatedResult.error.message}`,
        });
    }
    req.body.updated_by = req.user._id
    req.body.status = modelStatus.HUMAN_ANNOTATED
    req.body.surgical_history_note = req.body.surgical_history ? req.body.surgical_history_note : null

    try {
        const report = await webModel.Report.findOneAndUpdate(
            {
                _id: req.body.report_id,
                status: {
                    $in: [
                        modelStatus.AI_ANNOTATED,
                        modelStatus.HUMAN_ANNOTATED
                    ]
                }
            },
            req.body,
            { new: true }
        )

        if (!report) return res.status(400).json({ success: false, message: `Cannot update report ${req.body.report_id}` })

        return res.status(200).json({
            success: true, message: 'Update report successfully', data: {
                report_index: generateShortId(report?.id),
                report_id: report.id
            }
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

const deleteById = async (req, res) => {
    if (!req.params.report_id) return res.status(400).json({ success: false, message: `Report ${req.params.report_id} not found` })
    try {
        const report = await webModel.Report.findById(
            req.params.report_id,
            ["question_id", "personal_info_id", "original_path", "gradcam_path"]
        )
        
        if (report.original_path) {
            let resultDir = report.original_path.split('/')
            resultDir.pop()
            resultDir = resultDir.join('/')
            resultDir = path.join(root, resultDir)

            if (fs.existsSync(resultDir)) {
                await fs.promises.rm(resultDir, { recursive: true, force: true });
            }
        }

        const deletedReport = await webModel.Report.findByIdAndDelete(report._id)
        const personalInfo = await webModel.PersonalInfo.findByIdAndDelete(report.personal_info_id)
        const question = await webModel.Questionnaire.findByIdAndDelete(report.question_id)

        return res.status(200).json({
            success: true, message: 'Update report successfully', data: {
                report_index: generateShortId(deletedReport?.id),
                report_id: deletedReport?.id,
                personal_info_id: personalInfo?.id,
                question_id: question?._id
            }
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

module.exports = {
    getImage,
    viewResult,
    getById,
    update,
    deleteById
}