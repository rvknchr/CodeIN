const mongoose = require('mongoose');
const bookSchema = require('./BookSchema');

const createBookModel = (subject) => {
    const collectionName = `${subject}DB`; // Example: JavaDB, C++DB
    return mongoose.model(collectionName, bookSchema, collectionName);
};

module.exports = createBookModel;
