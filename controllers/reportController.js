const webModel = require('../schema')
const path = require('path');
const fs = require('fs')

// get image by accession_no (PACS) or by predicted result id + finding's name (overlay image)
const getImage = async (req, res) => {
    try {
        const report = await webModel.Report.findById(req.query.report_id)

        if (req.query.finding == "original" && report.original_path) {
            if (fs.existsSync(report.original_path)) return res.status(200).sendFile(report.original_path)
        }

        if (req.query.finding == "gradcam" && report.gradcam_path) {
            if (fs.existsSync(report.gradcam_path)) return res.status(200).sendFile(report.gradcam_path)
        }

        return res.status(400).json({ success: false, message: 'Image not found' })
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: e.message })
    }
}

const viewHistory = async (req, res) => {
    try {
        let reports = await webModel.Report.find()
            .populate("personal_info_id", ["hn", "name"])
            .populate("created_by", ["username"])

        reports = reports.map((report, idx) => {
            const prediction = report.DD_probability >= 0.5 ? "DD" : "non-DD"
            return {
                index: idx + 1,
                status: report.status,
                HN: report.personal_info_id.hn,
                name: report.personal_info_id.name,
                label: report.label,
                prediction,
                evaluation: report.label == prediction ? true : false,
                date: report.createdAt,
                clinician: report.created_by.username,
                hospital: report.hospital
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

module.exports = {
    getImage,
    viewHistory
}