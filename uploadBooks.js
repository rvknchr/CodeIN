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

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

async function listFilesInFolder(folderId) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf'`,
        fields: 'files(id, name, mimeType, size)',
    });
    return res.data.files;
}

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

function calculateDocumentSize(doc) {
    const bson = require('bson');
    const serialized = bson.serialize(doc);
    return serialized.length;
}

async function insertBooks(folderId, bookModel) {
    await connectDB();
    const notInsertedFilePath = path.join(__dirname, 'NotInserted.txt');

    if (!fs.existsSync(notInsertedFilePath)) {
        fs.writeFileSync(notInsertedFilePath, `Folder ID: ${folderId}, Subject: ${bookModel}\n`);
    } else {
        await appendFile(notInsertedFilePath, `\nFolder ID: ${folderId}, Subject: ${bookModel}\n`);
    }

    try {
        const files = await listFilesInFolder(folderId);

        for (const file of files) {
            console.log(`File: ${file.name}`);
            console.log(`File Size: ${file.size} Bytes`);

            // Check file size and ignore if greater than 16MB
            if (parseInt(file.size, 10) >= 14 * 1024 * 1024) { // 14MB in bytes
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

            const Book = createBookModel(bookModel);

            const bookTypes = ['Textbook', 'Notes', 'RoadMap', 'Project', 'PlacementMaterial'];
            console.log('Select the type of the book:');
            bookTypes.forEach((type, index) => {
                console.log(`${index + 1}. ${type}`);
            });
            const typeIndex = prompt('Enter the number corresponding to the book type: ');
            const selectedType = bookTypes[typeIndex - 1];

            const tags = [bookModel];
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
                authors: ['PH Community'],
                tags: tags,
                rating: 0,
                reviews: [],
                type: selectedType,
                file: {
                    fileName: file.name,
                    fileType: file.mimeType,
                    fileSize: parseInt(file.size, 10),
                    fileData: fileData,
                },
                subject: bookModel,
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

const folderId = '1F9n10ZcmN3OZ_bNCOmULWwzw7y9bigtU'; // prompt('Enter the FolderID: ');
const bookModel = prompt('Enter the subject name: ');
insertBooks(folderId, bookModel);
