const webModel = require('../schema')
const path = require('path');
const fs = require('fs')
const { generateShortId } = require('../utils/reusableFunction');
const { modelStatus } = require('../utils/status')
const Joi = require('joi');
const XLSX = require('xlsx')

const root = path.join(__dirname, "..");

const updateSchema = {
    report_id: Joi.string().required(),
    // user_id: Joi.string().required(),
    label: Joi.string().valid("DD", "non-DD").required(),
    final_diag: Joi.array().items(Joi.string().valid("symptoms", "manometry", "BET", "defecography", "CTT")).max(5).required(),
    ctt_result: Joi.string().valid("delayed", "normal", "not done").required(),
    anorectal_structural_abnormality: Joi.string().valid("no", "rectocele", "intussusception", "not assess", "other").required(),
    anorectal_structural_abnormality_note: Joi.string().max(100).required(),
    IBS: Joi.boolean().required(),
    comorbidity: Joi.string().valid("none", "stroke", "parkinson", "cipo", "other").required(),
    comorbidity_note: Joi.string().max(100).required(),
    surgery: Joi.boolean().required(),
    surgery_note: Joi.string().max(50),
    comments: Joi.string().max(100),
};

const updateValidator = Joi.object(updateSchema);

// get image by report id
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

// get all reports
const viewResult = async (req, res) => {
    try {
        let reports = await webModel.Report.find()
            .select([
                "status",
                "personal_info_id",
                "created_by",
                "label",
                // "createdAt",
                "updatedAt",
                "_id",
                "DD_probability",
                "task"
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
                // evaluation: report.label == prediction ? true : false,
                date: report.updatedAt,
                clinician: report.created_by.username,
                hospital: report.personal_info_id.hospital,
                DD_confidence: report.personal_info_id.DD_confidence,
                model: report.task
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

// get report by id
const getById = async (req, res) => {
    try {
        let report = await webModel.Report.findById(req.params.report_id)
            .populate("personal_info_id")
            .populate("question_id")
            .populate("created_by", ["username", "first_name", "last_name", "hospital"])
            .populate("updated_by", ["username", "first_name", "last_name", "hospital"])

        if (!report)
            return res.status(400).json({ success: false, message: 'Report not found' })

        data = report.toObject()
        data.index = generateShortId(report.id)

        // delete unrelated fields
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

// update report by id
const update = async (req, res) => {
    // validate input
    const validatedResult = updateValidator.validate(req.body);
    if (validatedResult.error) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: ${validatedResult.error.message}`,
        });
    }
    req.body = validatedResult.value
    req.body.updated_by = req.user._id
    req.body.status = modelStatus.HUMAN_ANNOTATED

    // check if note field is required
    if (req.body.surgery && !req.body.surgery_note)
        return res.status(400).json({
            success: false,
            message: `Invalid input: "surgery_note" is required`,
        });
    if (req.body.anorectal_structural_abnormality == "other" && !req.body.anorectal_structural_abnormality_note)
        return res.status(400).json({
            success: false,
            message: `Invalid input: "anorectal_structural_abnormality_note" is required`,
        });
    if (req.body.comorbidity == "other" && !req.body.comorbidity_note)
        return res.status(400).json({
            success: false,
            message: `Invalid input: "comorbidity_note" is required`,
        });
    req.body.surgery_note = req.body.surgery ? req.body.surgery_note : null
    req.body.anorectal_structural_abnormality_note = req.body.anorectal_structural_abnormality == "other" ? req.body.anorectal_structural_abnormality_note : null
    req.body.comorbidity_note = req.body.comorbidity == "other" ? req.body.comorbidity_note : null
    req.body.comments = req.body.comments ?? null

    try {
        // only report with status AI_ANNOTATED and HUMAN_ANNOTATED can be updated
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

        if (!report) return res.status(400).json({ success: false, message: `Cannot update report ${req.body.report_id} because of invalid report id/status` })

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

// delete report by id
const deleteById = async (req, res) => {
    if (!req.params.report_id) return res.status(400).json({ success: false, message: `Report ${req.params.report_id} not found` })
    try {
        const report = await webModel.Report.findById(
            req.params.report_id,
            ["question_id", "personal_info_id", "original_path", "gradcam_path"]
        )

        // delete report's directory
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

// generate questionnaire file data
const exportQuestionnaire = async (req, res) => {
    try {
        const report = await webModel.Report.findById(req.params.report_id).populate("question_id")

        if (!report) return res.status(400).json({ success: false, message: 'Report not found' })
        if (!report.question_id)
            return res.status(400).json({
                success: false,
                message: `Report ${req.params.report_id} has no questionnaire`
            })

        // create xlsx file from json
        const ws = XLSX.utils.json_to_sheet([
            {
                name: "DistFreq",
                description: "1. ท่านมี “อาการอึดอัดแน่นท้อง” หรือไม่",
                value: report.question_id["DistFreq"]
            },
            {
                name: "DistSev",
                description: "1.1. ระดับความรุนแรงของอาการมากน้อยเพียงไร",
                value: report.question_id["DistSev"]
            },
            {
                name: "DistDur",
                description: "1.2. ท่านสังเกตว่าท่านมีอาการอึดอัดแน่นท้องติดต่อกันมาเป็นเวลากี่เดือน",
                value: report.question_id["DistDur"]
            },
            {
                name: "FreqStool",
                description: "2. ท่านถ่ายอุจจาระกี่ครั้งต่อสัปดาห์",
                value: report.question_id["FreqStool"]
            },
            {
                name: "Incomplete",
                description: "3. ท่านรู้สึกถ่ายไม่สุดมากกว่า 25% ของจำนวนครั้งของการถ่ายอุจจาระหรือไม่",
                value: report.question_id["Incomplete"]
            },
            {
                name: "Strain",
                description: "4. ท่านมีอาการต้องเบ่งถ่ายมากกว่าปกติ มากกว่า 25% ของจำนวนครั้งของการถ่ายหรือไม่",
                value: report.question_id["Strain"]
            },
            {
                name: "Hard",
                description: "5. ท่านมีอาการอุจจาระแข็งมากกว่าปกติ มากกว่า 25% ของจำนวนครั้งของการถ่ายหรือไม่",
                value: report.question_id["Hard"]
            },
            {
                name: "Block",
                description: "6. ท่านรู้สึกว่ามีอะไรอุดตันหรืออุดกั้นที่ทวารหนักเวลาถ่าย มากกว่า 25% ของจำนวนครั้งของการถ่ายหรือไม่",
                value: report.question_id["Block"]
            },
            {
                name: "Digit",
                description: "7. ท่านต้องใช้นิ้วมือช่วยในการถ่ายอุจจาระ มากกว่า 25% ของจำนวนครั้งของการถ่ายหรือไม่",
                value: report.question_id["Digit"]
            },
            {
                name: "BloatFreq",
                description: "8. ท่านมีอาการ “อืดแน่นท้องหรือมีลมมากในท้อง” หรือไม่",
                value: report.question_id["BloatFreq"]
            },
            {
                name: "BloatSev",
                description: "8.1. ระดับความรุนแรงของอาการมากน้อยเพียงไร",
                value: report.question_id["BloatSev"]
            },
            {
                name: "BloatDur",
                description: "8.2. ระยะเวลาที่เป็นทั้งหมดกี่เดือน",
                value: report.question_id["BloatDur"]
            },
            {
                name: "SevScale",
                description: "9. ความรุนแรงของอาการทางเดินอาหารทั้งหมดโดยรวมอยู่ในระดับใด",
                value: report.question_id["SevScale"]
            }
        ], { header: ["name", "description", "value"] })
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws);
        const wbbuf = XLSX.write(wb, { type: 'buffer' });

        res.writeHead(200, [
            ['Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        ]);
        return res.end(wbbuf)
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

module.exports = {
    getImage,
    viewResult,
    getById,
    update,
    deleteById,
    exportQuestionnaire
}