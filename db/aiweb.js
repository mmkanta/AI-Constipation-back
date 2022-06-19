let mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// aiweb database
mongoose = mongoose
    .createConnection(process.env.DB_URL)
    .on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = mongoose;