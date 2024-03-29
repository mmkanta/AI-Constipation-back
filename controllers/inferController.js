const Joi = require("joi");
const webModel = require('../schema')
const path = require('path');
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data');
const extract = require('extract-zip')
const dotenv = require('dotenv')
const { modelStatus, modelTask, hospitalList } = require('../utils/status')
const { generateShortId } = require('../utils/reusableFunction')
dotenv.config()

const pyURL = process.env.PY_SERVER + '/api/infer';
const root = path.join(__dirname, "..");

const questionSchema = {
    questionnaire: Joi.object({
        DistFreq: Joi.number().min(0).max(6).integer().required(),
        DistSev: Joi.number().min(0).max(3).integer().required(),
        DistSevFreq: Joi.number().min(0).max(18).integer().required(),
        DistDur: Joi.number().min(0).max(240).required(),
        FreqStool: Joi.number().min(0).max(100).integer().required(),
        Incomplete: Joi.number().min(0).max(1).integer().required(),
        Strain: Joi.number().min(0).max(1).integer().required(),
        Hard: Joi.number().min(0).max(1).integer().required(),
        Block: Joi.number().min(0).max(1).integer().required(),
        Digit: Joi.number().min(0).max(1).integer().required(),
        BloatFreq: Joi.number().min(0).max(6).integer().required(),
        BloatSev: Joi.number().min(0).max(3).integer().required(),
        BloatSevFreq: Joi.number().min(0).max(18).integer().required(),
        BloatDur: Joi.number().min(0).max(240).required(),
        SevScale: Joi.number().min(0).max(10).required()
    }).required()
};

const personlInfoSchema = {
    personalInfo: Joi.object({
        hospital: Joi.string().valid(
            hospitalList.CU,
            hospitalList.PSU,
            hospitalList.TU).required(),
        hn: Joi.string().max(15).required(),
        name: Joi.string().max(50).required(),
        gender: Joi.string().max(15)
            .valid("F", "M").required(),
        age: Joi.number().min(0).max(200).required(),
        DD_confidence: Joi.number().min(0).max(100).required()
    }).required()
}

const questionValidator = Joi.object(questionSchema);
const personalInfoValidator = Joi.object(personlInfoSchema);

const questionnaireInfer = async (req, res) => {
    // validate questionnaire + personalInfo 
    const validatedQuestion = questionValidator.validate({
        questionnaire: {
            DistFreq: req.body.questionnaire.DistFreq,
            DistSev: req.body.questionnaire.DistSev,
            DistSevFreq: req.body.questionnaire.DistSevFreq,
            DistDur: req.body.questionnaire.DistDur,
            FreqStool: req.body.questionnaire.FreqStool,
            Incomplete: req.body.questionnaire.Incomplete,
            Strain: req.body.questionnaire.Strain,
            Hard: req.body.questionnaire.Hard,
            Block: req.body.questionnaire.Block,
            Digit: req.body.questionnaire.Digit,
            BloatFreq: req.body.questionnaire.BloatFreq,
            BloatSev: req.body.questionnaire.BloatSev,
            BloatSevFreq: req.body.questionnaire.BloatSevFreq,
            BloatDur: req.body.questionnaire.BloatDur,
            SevScale: req.body.questionnaire.SevScale
        }
    })
    const validatedInfo = personalInfoValidator.validate({
        personalInfo: req.body.personalInfo,
    })
    if (validatedQuestion.error || validatedInfo.error) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: ${(validatedInfo.error) ? validatedInfo.error.message : validatedQuestion.error.message}`
        })
    }
    req.body.questionnaire = validatedQuestion.value.questionnaire
    req.body.personalInfo = validatedInfo.value.personalInfo
    if (
        (req.body.questionnaire["DistFreq"] * req.body.questionnaire["DistSev"] != req.body.questionnaire["DistSevFreq"]) ||
        (req.body.questionnaire["BloatFreq"] * req.body.questionnaire["BloatSev"] != req.body.questionnaire["BloatSevFreq"])
    )
        return res.status(400).json({
            success: false,
            message: `Invalid input: DistSevFreq or BloatSevFreq is incorrect`
        })

    // convert questionnaire object to array of number
    let questionArr = []
    for (const [key, value] of Object.entries(req.body.questionnaire)) questionArr.push(value)

    try {
        const personalInfo = await webModel.PersonalInfo.create(req.body.personalInfo)
        const questionnaire = await webModel.Questionnaire.create(req.body.questionnaire)

        const report = await webModel.Report.create({
            question_id: questionnaire._id,
            personal_info_id: personalInfo._id,
            task: modelTask.QUESTIONNAIRE,
            status: modelStatus.IN_PROGRESS,
            DD_probability: null,
            label: null,
            final_diag: null,
            ctt_result: null,
            anorectal_structural_abnormality: null,
            anorectal_structural_abnormality_note: null,
            IBS: null,
            comorbidity: null,
            comorbidity_note: null,
            surgery: null,
            surgery_note: null,
            comments: null,
            created_by: req.user._id,
            updated_by: null,
            gradcam_path: null,
            original_path: null,
        })

        // python server request
        axios.post(pyURL + "/questionnaire", {
            'questionnaire': questionArr
        }).then(async res => {
            // update report's status and dd probability
            const dd_prob = res.data.data.DD_probability
            await webModel.Report.findByIdAndUpdate(report._id, {
                status: modelStatus.AI_ANNOTATED,
                DD_probability: dd_prob
            })
            console.log('Finish Inference')
        }).catch(async e => {
            // if python server send an error, then change report's status to canceled
            await webModel.Report.findByIdAndUpdate(report._id, { status: modelStatus.CANCELED })
            console.log(e.message, e.response?.data.toString())
            // const errMsg = e.message.includes('status code 500')? `Model Error: ${e.response?.data.toString()}`: e.message
        })

        return res.status(200).json({
            success: true, message: `Start inference`, data: {
                report_index: generateShortId(report.id),
                report_id: report.id
            }
        })

    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }
}

const imageInfer = async (req, res) => {
    // check if uploaded file is empty
    if (req.file === undefined) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: Image file must be .png or .jpeg`
        })
    }
    const oldPath = path.join(root, "/resources/uploads/", req.file.filename)

    // validate personalInfo
    try {
        req.body.personalInfo = JSON.parse(req.body.personalInfo)
    } catch (e) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(400).json({
            success: false,
            message: `Invalid input: Personal Info must be in string JSON format`
        })
    }
    const validatedInfo = personalInfoValidator.validate({
        personalInfo: req.body.personalInfo,
    })
    if (validatedInfo.error) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(400).json({
            success: false,
            message: `Invalid input: ${(validatedInfo.error.message)}`
        })
    }
    req.body.personalInfo = validatedInfo.value.personalInfo

    let personalInfo = {}
    let report = {}
    try {
        personalInfo = await webModel.PersonalInfo.create(req.body.personalInfo)
        report = await webModel.Report.create({
            question_id: null,
            personal_info_id: personalInfo._id,
            task: modelTask.IMAGE,
            status: modelStatus.IN_PROGRESS,
            DD_probability: null,
            label: null,
            final_diag: null,
            ctt_result: null,
            anorectal_structural_abnormality: null,
            anorectal_structural_abnormality_note: null,
            IBS: null,
            comorbidity: null,
            comorbidity_note: null,
            surgery: null,
            surgery_note: null,
            comments: null,
            created_by: req.user._id,
            updated_by: null,
            gradcam_path: null,
            original_path: `resources/uploads/${req.file.filename}`, // temporary path
        })
    } catch (e) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }

    const todayYear = String((new Date()).getUTCFullYear())
    const todayMonth = String((new Date()).getUTCMonth() + 1)
    // define report's directory
    const reportDir = path.join(root, "/resources/reports/", todayYear, todayMonth, String(report._id))
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    try {
        const data = new FormData()
        data.append('file', fs.createReadStream(oldPath))

        // python server request
        axios.post(pyURL + "/image", data, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
            },
            responseType: 'arraybuffer'
        }).then(async res => {
            // move uploaded file into report's directory and change filename to original name
            const newPath = path.join(reportDir, req.file.originalname)
            await fs.promises.rename(oldPath, newPath)

            fs.writeFileSync(path.join(reportDir, 'result.zip'), res.data);

            // extract zip file to report directory (gradcam file + prediction file)
            await extract(path.join(reportDir, 'result.zip'), { dir: reportDir })

            let modelResult = JSON.parse(fs.readFileSync(path.join(reportDir, '/prediction.txt')));
            // delete zip file
            await fs.promises.unlink(path.join(reportDir, '/result.zip'))

            // delete prediction file
            await fs.promises.unlink(path.join(reportDir, '/prediction.txt'))

            // update report's status + dd probability + filepath
            await webModel.Report.findByIdAndUpdate(report._id, {
                status: modelStatus.AI_ANNOTATED,
                DD_probability: modelResult.DD_probability,
                gradcam_path: `resources/reports/${todayYear}/${todayMonth}/${String(report._id)}/gradcam.png`,
                original_path: `resources/reports/${todayYear}/${todayMonth}/${String(report._id)}/${req.file.originalname}`
            })
            console.log('Finish Inference')

        }).catch(async e => {
            await webModel.Report.findByIdAndUpdate(report._id, { status: modelStatus.CANCELED })
            if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
            if (fs.existsSync(reportDir)) {
                fs.rm(reportDir, { recursive: true, force: true }, (err) => {
                    if (err) console.log(err)
                });
            }
            console.log(e)
        })

        return res.status(200).json({
            success: true, message: `Start inference`, data: {
                report_index: generateShortId(report.id),
                report_id: report.id
            }
        })
    } catch (e) {
        console.log(e)
        await webModel.Report.findByIdAndUpdate(report._id, { status: modelStatus.CANCELED })
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        if (fs.existsSync(reportDir)) {
            fs.rm(reportDir, { recursive: true, force: true }, (err) => {
                if (err) console.log(err)
            });
        }
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }
}

const integrateInfer = async (req, res) => {
    // check if uploaded file is empty
    if (req.file === undefined) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: Image file must be .png or .jpeg`
        })
    }
    const oldPath = path.join(root, "/resources/uploads/", req.file.filename)

    // validate questionnaire + personalInfo
    try {
        req.body.personalInfo = JSON.parse(req.body.personalInfo)
        req.body.questionnaire = JSON.parse(req.body.questionnaire)
    } catch (e) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(400).json({
            success: false,
            message: `Invalid input: Personal Info/Questionnaire must be in string JSON format`
        })
    }

    const validatedQuestion = questionValidator.validate({
        questionnaire: {
            DistFreq: req.body.questionnaire.DistFreq,
            DistSev: req.body.questionnaire.DistSev,
            DistSevFreq: req.body.questionnaire.DistSevFreq,
            DistDur: req.body.questionnaire.DistDur,
            FreqStool: req.body.questionnaire.FreqStool,
            Incomplete: req.body.questionnaire.Incomplete,
            Strain: req.body.questionnaire.Strain,
            Hard: req.body.questionnaire.Hard,
            Block: req.body.questionnaire.Block,
            Digit: req.body.questionnaire.Digit,
            BloatFreq: req.body.questionnaire.BloatFreq,
            BloatSev: req.body.questionnaire.BloatSev,
            BloatSevFreq: req.body.questionnaire.BloatSevFreq,
            BloatDur: req.body.questionnaire.BloatDur,
            SevScale: req.body.questionnaire.SevScale
        }
    })
    const validatedInfo = personalInfoValidator.validate({
        personalInfo: req.body.personalInfo,
    })
    if (validatedQuestion.error || validatedInfo.error) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(400).json({
            success: false,
            message: `Invalid input: ${(validatedInfo.error) ? validatedInfo.error.message : validatedQuestion.error.message}`
        })
    }
    req.body.questionnaire = validatedQuestion.value.questionnaire
    req.body.personalInfo = validatedInfo.value.personalInfo
    if (
        (req.body.questionnaire["DistFreq"] * req.body.questionnaire["DistSev"] != req.body.questionnaire["DistSevFreq"]) ||
        (req.body.questionnaire["BloatFreq"] * req.body.questionnaire["BloatSev"] != req.body.questionnaire["BloatSevFreq"])
    )
        return res.status(400).json({
            success: false,
            message: `Invalid input: DistSevFreq or BloatSevFreq is incorrect`
        })

    // convert questionnaire object to array of number
    let questionArr = []
    for (const [key, value] of Object.entries(req.body.questionnaire)) questionArr.push(value)

    let personalInfo = {}
    let report = {}
    let questionnaire = {}
    try {
        personalInfo = await webModel.PersonalInfo.create(req.body.personalInfo)
        questionnaire = await webModel.Questionnaire.create(req.body.questionnaire)
        report = await webModel.Report.create({
            question_id: questionnaire._id,
            personal_info_id: personalInfo._id,
            task: modelTask.INTEGRATE,
            status: modelStatus.IN_PROGRESS,
            DD_probability: null,
            label: null,
            final_diag: null,
            ctt_result: null,
            anorectal_structural_abnormality: null,
            anorectal_structural_abnormality_note: null,
            IBS: null,
            comorbidity: null,
            comorbidity_note: null,
            surgery: null,
            surgery_note: null,
            comments: null,
            created_by: req.user._id,
            updated_by: null,
            gradcam_path: null,
            original_path: `resources/uploads/${req.file.filename}`, // temporary path
        })
    } catch (e) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }

    const todayYear = String((new Date()).getUTCFullYear())
    const todayMonth = String((new Date()).getUTCMonth() + 1)
    // define report's directory
    const reportDir = path.join(root, "/resources/reports/", todayYear, todayMonth, String(report._id))
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    try {
        const data = new FormData()
        data.append('file', fs.createReadStream(oldPath))
        data.append('questionnaire', JSON.stringify(questionArr))

        // python server request
        axios.post(pyURL + "/integrate", data, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
            },
            responseType: 'arraybuffer'
        }).then(async res => {
            // move uploaded file into report's directory and change filename to original name
            const newPath = path.join(reportDir, req.file.originalname)
            await fs.promises.rename(oldPath, newPath)

            fs.writeFileSync(path.join(reportDir, 'result.zip'), res.data);

            // extract zip file to report directory (overlay file + prediction file)
            await extract(path.join(reportDir, 'result.zip'), { dir: reportDir })

            let modelResult = JSON.parse(fs.readFileSync(path.join(reportDir, '/prediction.txt')));
            // delete zip file
            await fs.promises.unlink(path.join(reportDir, '/result.zip'))

            // delete prediction file
            await fs.promises.unlink(path.join(reportDir, '/prediction.txt'))

            // update report's status + dd probability + filepath
            await webModel.Report.findByIdAndUpdate(report._id, {
                status: modelStatus.AI_ANNOTATED,
                DD_probability: modelResult.DD_probability,
                gradcam_path: `resources/reports/${todayYear}/${todayMonth}/${String(report._id)}/gradcam.png`,
                original_path: `resources/reports/${todayYear}/${todayMonth}/${String(report._id)}/${req.file.originalname}`
            })
            console.log('Finish Inference')

        }).catch(async e => {
            await webModel.Report.findByIdAndUpdate(report._id, { status: modelStatus.CANCELED })
            if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
            if (fs.existsSync(reportDir)) {
                fs.rm(reportDir, { recursive: true, force: true }, (err) => {
                    if (err) console.log(err)
                });
            }
            console.log(e)
        })

        return res.status(200).json({
            success: true, message: `Start inference`, data: {
                report_index: generateShortId(report.id),
                report_id: report.id
            }
        })
    } catch (e) {
        console.log(e)
        await webModel.Report.findByIdAndUpdate(report._id, { status: modelStatus.CANCELED })
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        if (fs.existsSync(reportDir)) {
            fs.rm(reportDir, { recursive: true, force: true }, (err) => {
                if (err) console.log(err)
            });
        }
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }
}

// generate template
const generateTemplate = async (req, res) => {
    try {
        const file = path.join(root, "/resources/templates/template.xlsx")
        return res.sendFile(file)
    } catch (e) {
        return res.status(500).json({ success: false, message: `Internal server error` })
    }

}

// generate template description
const generateDescription = async (req, res) => {
    try {
        const file = path.join(root, "/resources/templates/template_description.xlsx")
        return res.sendFile(file)
    } catch (e) {
        return res.status(500).json({ success: false, message: `Internal server error` })
    }

}

module.exports = {
    questionnaireInfer,
    imageInfer,
    integrateInfer,
    generateTemplate,
    generateDescription
}