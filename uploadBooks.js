require('dotenv').config();
const { google } = require('googleapis');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');
const createBookModel = require('./models/DynamicBookModel');
const { WritableStreamBuffer } = require('stream-buffers');
const prompt = require('prompt-sync')();
const util = require('util');
const appendFile = util.promisify(fs.appendFile);

// Set the Google API credentials using the environment variable
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Initialize the Google Drive API client
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

// Function to list files in a Google Drive folder
async function listFilesInFolder(folderId) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf'`,
        fields: 'files(id, name, mimeType, size)',
    });
    return res.data.files;
}

// Function to stream and encode a file in Base64
async function streamFileData(fileId) {
    const bufferStream = new WritableStreamBuffer();
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

    await new Promise((resolve, reject) => {
        res.data
            .on('end', resolve)
            .on('error', reject)
            .pipe(bufferStream);
    });

    return bufferStream.getContents().toString('base64');
}

// Function to calculate the size of a MongoDB document
function calculateDocumentSize(doc) {
    const bson = require('bson');
    const serialized = bson.serialize(doc);
    return serialized.length;
}

// Function to insert books into MongoDB
async function insertBooks(folderId) {
    await connectDB();
    const notInsertedFilePath = path.join(__dirname, 'NotInserted.txt');

    // Ensure the NotInserted.txt file exists and write the header
    if (!fs.existsSync(notInsertedFilePath)) {
        fs.writeFileSync(notInsertedFilePath, `Folder ID: ${folderId}, Subject: Python\n`);
    } else {
        await appendFile(notInsertedFilePath, `\nFolder ID: ${folderId}, Subject: Python\n`);
    }

    try {
        const files = await listFilesInFolder(folderId);

        for (const file of files) {
            console.log(`File: ${file.name}`);
            console.log(`File Size: ${file.size} Bytes`);

            // Check file size and ignore if greater than 16MB
            if (parseInt(file.size, 10) >= 14 * 1024 * 1024) { // 16MB in bytes
                console.log(`Skipping ${file.name}, size is greater than 16MB`);
                await appendFile(notInsertedFilePath, `${file.name}\n`);
                continue;
            }

            let fileData;
            try {
                fileData = await streamFileData(file.id);
            } catch (err) {
                console.log(`Error streaming file data for ${file.name}: ${err.message}`);
                await appendFile(notInsertedFilePath, `${file.name}\n`);
                continue;
            }

            const Book = createBookModel('Python'); // Adjust the model name as necessary

            // Prompt user to select the book type
            const bookTypes = ['Textbook', 'Notes', 'RoadMap', 'Project', 'PlacementMaterial'];
            console.log('Select the type of the book:');
            bookTypes.forEach((type, index) => {
                console.log(`${index + 1}. ${type}`);
            });
            const typeIndex = prompt('Enter the number corresponding to the book type: ');
            const selectedType = bookTypes[typeIndex - 1];

            // Prompt user for additional tags until they choose to stop
            const tags = ['FrontEnd'];
            let addMoreTags = true;
            while (addMoreTags) {
                const newTag = prompt('Enter a tag (or press Enter to stop adding tags): ');
                if (newTag.trim() === '') {
                    addMoreTags = false;
                } else {
                    tags.push(newTag.trim());
                }
            }

            const newBookData = {
                name: file.name,
                authors: ['PH Community'], // Default author
                tags: tags, // Add default and user-provided tags
                rating: 0, // Default rating
                reviews: [], // Default reviews
                type: selectedType, // Use the user-selected type
                file: {
                    fileName: file.name,
                    fileType: file.mimeType,
                    fileSize: parseInt(file.size, 10),  // Parse the file size as an integer
                    fileData: fileData,
                },
                subject: 'FrontEnd', // Default subject, adjust as necessary
            };

            // Calculate the document size
            const docSize = calculateDocumentSize(newBookData);
            console.log(`Document Size: ${docSize} Bytes`);
            if (docSize >= 14 * 1024 * 1024) { // 16MB in bytes
                console.log(`Skipping ${file.name}, total document size is greater than 16MB`);
                await appendFile(notInsertedFilePath, `${file.name}\n`);
                continue;
            }

            const newBook = new Book(newBookData);
            await newBook.save();

            console.log(`Inserted: ${file.name} as ${selectedType}`);
        }

        console.log('All books inserted successfully');
    } catch (error) {
        console.error('Error inserting books:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Usage example
const folderId = '1pBwgUVffHIRAg8xsKQVpC7bixPCj_zqZ'; // Replace with your Google Drive folder ID
insertBooks(folderId);
