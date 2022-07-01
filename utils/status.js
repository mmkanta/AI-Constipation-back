const modelStatus = {
    WAITING: "waiting",
    IN_PROGRESS: "in progress",
    AI_ANNOTATED: "annotated",
    HUMAN_ANNOTATED: "reviewed",
    // FINALIZED: "finalized",
    CANCELED: "canceled"
}

const userStatus = {
    ACTIVE: "active",
    INACTIVE: "inactive"
}

const userRole = {
    GENERAL: "general",
    CLINICIAN: "clinician",
    ADMIN: "admin"
}

const modelTask = {
    QUESTIONNAIRE: "questionnaire",
    IMAGE: "image",
    INTEGRATE: "integrate"
}

const hospitalList = {
    PSU: "Prince of Songkla University",
    TU: "Thammasat University",
    CU: "Chulalongkorn University"
}

module.exports = {
    modelStatus,
    userStatus,
    userRole,
    modelTask,
    hospitalList
}