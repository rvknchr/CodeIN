const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    username: { type: String, required: true },
    review: { type: String, required: true },
    time: { type: Date, default: Date.now }
});

const fileSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileData: { type: String, required: true }
});

const bookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    authors: { type: [String], default: ['PH Community'] },
    tags: [String],
    rating: { type: Number, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
    type: { type: String, enum: ['Textbook', 'Notes', 'RoadMap', 'Project', 'PlacementMaterial' ], required: true },
    file: { type: fileSchema, required: true },
    subject: { type: String, required: true }
});

module.exports = bookSchema;
