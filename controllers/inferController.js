const Joi = require("joi");
const webModel = require('../schema')
const path = require('path');
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data');
const extract = require('extract-zip')
const dotenv = require('dotenv')
const { modelStatus } = require('../utils/status')
// let con1 = require('../db/webapp')
dotenv.config()

const questionSchema = {
    questionnaire: Joi.object({
        fdisc: Joi.number().required(),
        sev3: Joi.number().required(),
        fdiscxsev3: Joi.number().required(),
        dur3: Joi.number().required(),
        fstool: Joi.number().required(),
        incomplete: Joi.number().required(),
        strain: Joi.number().required(),
        hard: Joi.number().required(),
        block: Joi.number().required(),
        digit: Joi.number().required(),
        ppd: Joi.number().required(),
        sev9: Joi.number().required(),
        ppdxsev9: Joi.number().required(),
        dur9: Joi.number().required(),
        scalesev: Joi.number().required()
    }).required()
};

const personlInfoSchema = {
    personalInfo: Joi.object({
        hospital: Joi.string().required(),
        hn: Joi.string().required(),
        name: Joi.string().required(),
        gender: Joi.string().required(),
        age: Joi.number().required(),
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
    console.log(req.body.questionnaire)
    console.log(req.body.personalInfo)

    const todayYear = String((new Date()).getUTCFullYear())
    const todayMonth = String((new Date()).getUTCMonth() + 1)

    return res.status(200).json({
        success: true,
        message: `success`
    })
}

const imageInfer = async (req, res) => {
    console.log(req.file)
    if (req.file === undefined)
        return res.status(400).json({
            success: false,
            message: `Invalid input: Image file must be .png or .jpeg`
        })

    try {
        req.body.personalInfo = JSON.parse(req.body.personalInfo)
    } catch (e) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: Personal Info must be in JSON format`
        })
    }
    
    const validatedInfo = personalInfoValidator.validate({
        personalInfo: req.body.personalInfo,
    })
    if (validatedInfo.error) {
        return res.status(400).json({
            success: false,
            message: `Invalid input: ${(validatedInfo.error.message)}`
        })
    }
    req.body.personalInfo = validatedInfo.value.personalInfo
    console.log(req.body.personalInfo)

    return res.status(200).json({
        success: true,
        message: `success`
    })
}

module.exports = {
    questionnaireInfer,
    imageInfer
}