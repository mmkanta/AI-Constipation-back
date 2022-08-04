const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { modelStatus, userStatus, userRole, hospitalList } = require('../../utils/status');
const mongoose = require('../aiweb')
const mg = require("mongoose");
const schema = new mg.Schema();

dotenv.config();

const webappSeed = async () => {

    const User = mongoose.model('users', schema)
    const PersonalInfo = mongoose.model('personal_infos', schema)
    const Questionnaire = mongoose.model('questionnaires', schema)
    const Report = mongoose.model('reports', schema)

    await User.collection.drop()
    await PersonalInfo.collection.drop()
    await Questionnaire.collection.drop()
    await Report.collection.drop()

    const passwordHash = await bcrypt.hash('12312312', 10);

    const user = await User.collection.insertMany([
        {
            username: 'admin1',
            password: passwordHash,
            email: 'admin1@gmail.com',
            first_name: 'admin1',
            last_name: 'admin1',
            role: userRole.ADMIN,
            token: [],
            status: userStatus.ACTIVE,
            hospital: hospitalList.CU,
            createdAt: new Date('05/13/2022'),
            updatedAt: new Date('05/16/2022')
        }
    ])
}

const main = async () => {
    await webappSeed()
    console.log('finish')
}

main()