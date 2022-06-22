const { modelStatus, userRole } = require('../utils/status')

// verify if user id in token match
const userVerification = async (req, res, next) => {
    if (req.user.role !== userRole.ADMIN) {
        const user_id = req.params.user_id ?? undefined
        if (user_id !== req.user._id)
            return res.status(403).json({ success: false, message: `User have no permission to access user ${user_id}'s resource` })
    }
    next()
}

// verify if user is admin
const adminVerification = (req, res, next) => {
    if (req.user.role !== userRole.ADMIN) {
        return res.status(403).json({ success: false, message: `User must be admin to access the resource` })
    }
    next()
}

// verify if user is clinician
const clinicianVerification = (req, res, next) => {
    if (req.user.role !== userRole.CLINICIAN) {
        return res.status(403).json({ success: false, message: `User must be clinician to access the resource` })
    }
    next()
}

module.exports = {
    userVerification,
    adminVerification,
    clinicianVerification
}