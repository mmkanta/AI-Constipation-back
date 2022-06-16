const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { modelStatus, userStatus, userRole } = require('../../utils/status');
const mongoose = require('../aiweb')
const mg = require("mongoose");
const schema = new mg.Schema();

dotenv.config();

const webappSeed = async () => {

    const User = mongoose.model('users', schema)
    const PersonalInfo = mongoose.model('personal_infos', schema)
    const Questionnaire = mongoose.model('questionnaires', schema)
    const Image = mongoose.model('images', schema)
    const Report = mongoose.model('reports', schema)
    const Project = mongoose.model('projects', schema)
    const Gradcam = mongoose.model('gradcams', schema)
    const PredClass = mongoose.model('pred_classes', schema)

    await User.collection.drop()
    await PersonalInfo.collection.drop()
    await Questionnaire.collection.drop()
    await Image.collection.drop()
    await Report.collection.drop()
    await Project.collection.drop()
    await Gradcam.collection.drop()
    await PredClass.collection.drop()

    const passwordHash = await bcrypt.hash('12312312', 10);

    const user = await User.collection.insertMany([
        {
            username: 'john',
            password: passwordHash,
            email: 'john@gmail.com',
            first_name: 'John',
            last_name: 'Doe',
            role: userRole.CLINICIAN,
            token: [],
            status: userStatus.ACTIVE,
            createdAt: new Date('05/13/2022'),
            updatedAt: new Date('05/14/2022')
        },
        {
            username: 'jane',
            password: passwordHash,
            email: 'jane@gmail.com',
            first_name: 'Jane',
            last_name: 'Smith',
            role: userRole.GENERAL,
            token: [],
            status: userStatus.ACTIVE,
            createdAt: new Date('05/13/2022'),
            updatedAt: new Date('05/16/2022')
        },
        {
            username: 'admin1',
            password: passwordHash,
            email: 'admin1@gmail.com',
            first_name: 'admin1',
            last_name: 'admin1',
            role: userRole.ADMIN,
            token: [],
            status: userStatus.ACTIVE,
            createdAt: new Date('05/13/2022'),
            updatedAt: new Date('05/16/2022')
        },
    ])
}

const main = async () => {
    await webappSeed()
    console.log('finish')
}

main()