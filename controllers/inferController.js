const Joi = require("joi");
const webModel = require('../schema')
const path = require('path');
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data');
const extract = require('extract-zip')
const dotenv = require('dotenv')
const { modelStatus, modelTask } = require('../utils/status')
// let con1 = require('../db/webapp')
dotenv.config()

const pyURL = process.env.PY_SERVER + '/api/infer';
const root = path.join(__dirname, "..");

const questionSchema = {
    questionnaire: Joi.object({
        fdisc: Joi.number().min(0).required(),
        sev3: Joi.number().min(0).required(),
        fdiscxsev3: Joi.number().min(0).required(),
        dur3: Joi.number().min(0).required(),
        fstool: Joi.number().min(0).required(),
        incomplete: Joi.number().min(0).required(),
        strain: Joi.number().min(0).required(),
        hard: Joi.number().min(0).required(),
        block: Joi.number().min(0).required(),
        digit: Joi.number().min(0).required(),
        ppd: Joi.number().min(0).required(),
        sev9: Joi.number().min(0).required(),
        ppdxsev9: Joi.number().min(0).required(),
        dur9: Joi.number().min(0).required(),
        scalesev: Joi.number().min(0).required()
    }).required()
};

const personlInfoSchema = {
    personalInfo: Joi.object({
        hospital: Joi.string().max(50).required(),
        hn: Joi.string().max(15).required(),
        name: Joi.string().max(50).required(),
        gender: Joi.string().max(50).required(),
        age: Joi.number().min(0).required(),
    }).required()
}

const questionValidator = Joi.object(questionSchema);
const personalInfoValidator = Joi.object(personlInfoSchema);

const questionnaireInfer = async (req, res) => {
    // validate input
    const validatedQuestion = questionValidator.validate({
        questionnaire: {
            fdisc: req.body.questionnaire.fdisc,
            sev3: req.body.questionnaire.sev3,
            fdiscxsev3: req.body.questionnaire.fdiscxsev3,
            dur3: req.body.questionnaire.dur3,
            fstool: req.body.questionnaire.fstool,
            incomplete: req.body.questionnaire.incomplete,
            strain: req.body.questionnaire.strain,
            hard: req.body.questionnaire.hard,
            block: req.body.questionnaire.block,
            digit: req.body.questionnaire.digit,
            ppd: req.body.questionnaire.ppd,
            sev9: req.body.questionnaire.sev9,
            ppdxsev9: req.body.questionnaire.ppdxsev9,
            dur9: req.body.questionnaire.dur9,
            scalesev: req.body.questionnaire.scalesev
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
            IBS: null,
            cormorbidity: null,
            surgical_history: null,
            surgical_history_note: null,
            comments: null,
            created_by: req.user._id,
            updated_by: null,
            gradcam_path: null,
            original_path: null,
        })

        axios.post(pyURL + "/questionnaire", {
            'questionnaire': questionArr
        }).then(async res => {
            const dd_prob = res.data.data.DD_probability
            await webModel.Report.findByIdAndUpdate(report._id, {
                status: modelStatus.AI_ANNOTATED,
                DD_probability: dd_prob
            })
            console.log('Finish Inference')
        }).catch(async e => {
            // if AI server send an error, then change result's status to canceled
            await webModel.Report.findByIdAndUpdate(report._id, { status: modelStatus.CANCELED })
            console.log(e.message, e.response?.data.toString())
            // const errMsg = e.message.includes('status code 500')? `Model Error: ${e.response?.data.toString()}`: e.message
        })

        return res.status(200).json({ success: true, message: `Start inference` })

    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }
}

const imageInfer = async (req, res) => {
    const oldPath = path.join(root, "/resources/uploads/", req.file.filename)
    if (req.file === undefined) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(400).json({
            success: false,
            message: `Invalid input: Image file must be .png or .jpeg`
        })
    }

    try {
        req.body.personalInfo = JSON.parse(req.body.personalInfo)
    } catch (e) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(400).json({
            success: false,
            message: `Invalid input: Personal Info must be in JSON format`
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
            IBS: null,
            cormorbidity: null,
            surgical_history: null,
            surgical_history_note: null,
            comments: null,
            created_by: req.user._id,
            updated_by: null,
            gradcam_path: null,
            original_path: oldPath,
        })
    } catch (e) {
        if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath)
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message });
    }

    const todayYear = String((new Date()).getUTCFullYear())
    const todayMonth = String((new Date()).getUTCMonth() + 1)
    // define directory path
    const reportDir = path.join(root, "/resources/reports/", todayYear, todayMonth, String(report._id))
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    try {
        const data = new FormData()
        data.append('file', fs.createReadStream(oldPath))

        axios.post(pyURL + "/image", data, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
            },
            responseType: 'arraybuffer'
        }).then(async res => {
            const newPath = path.join(reportDir, req.file.originalname)
            await fs.promises.rename(oldPath, newPath)

            fs.writeFileSync(path.join(reportDir, 'result.zip'), res.data);
            console.log(path.join(reportDir, 'result.zip'), reportDir)

            // extract zip file to result directory (overlay files + prediction file)
            await extract(path.join(reportDir, 'result.zip'), { dir: reportDir })

            let modelResult = JSON.parse(fs.readFileSync(path.join(reportDir, '/prediction.txt')));
            // delete zip file
            await fs.promises.unlink(path.join(reportDir, '/result.zip'))

            // delete probability prediction file
            await fs.promises.unlink(path.join(reportDir, '/prediction.txt'))

            await webModel.Report.findByIdAndUpdate(report._id, {
                status: modelStatus.AI_ANNOTATED,
                DD_probability: modelResult.DD_probability,
                gradcam_path: path.join(root, "/resources/reports/", todayYear, todayMonth, String(report._id), "gradcam.png"),
                original_path: newPath
            })

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

        return res.status(200).json({ success: true, message: `Start inference` })
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

module.exports = {
    questionnaireInfer,
    imageInfer
}