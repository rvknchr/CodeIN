const mongoose = require('mongoose');
const bookSchema = require('./BookSchema');

const createBookModel = (subject) => {
    const collectionName = subject; // Example: Java, Cpp
    return mongoose.model(collectionName, bookSchema, collectionName);
};

module.exports = createBookModel;
