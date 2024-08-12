const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

const username = encodeURIComponent(process.env.MONGODB_USERNAME);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const host = process.env.MONGODB_HOST;
const dbName = process.env.MONGODB_DB;

const uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority`;

const connectDB = async () => {
    try {
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Hey failed!');
        console.error('Connection failed', error);
        process.exit(1);
    }
};

module.exports = connectDB;
