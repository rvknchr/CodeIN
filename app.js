const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const connectDB = require('./db');
const createBookModel = require('./models/DynamicBookModel');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.send("<h3>Landing page here</h3>");
  // res.render("home");
});

app.get("/books", async function(req, res) {
  try {
    await connectDB();
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(coll => coll.name);

    console.log(collectionNames);
    const data = {};

    for (const collection of collectionNames) {
      console.log(collection);
      const BookModel = createBookModel(collection);

      data[collection] = await BookModel.find()
        .select('name authors rating subject')
        // .sort({ rating: -1 })
        .limit(12);
    }

    res.render("booksCatalog", { booksData: data });
  } catch (err) {
    res.status(500).send(err);
  } finally {
    mongoose.connection.close();
  }
});


app.get("/books/:subject/:bookName", async function(req, res) {
  try {
    await connectDB();
    const { subject, bookName } = req.params;
    const BookModel = createBookModel(subject);
    console.log(bookName);
    const book = await BookModel.findOne({ name: bookName });
    console.log(book);

    if (!book) {
      return res.status(404).send("Book not found");
    }

    res.render("bookViewer", { fileData: book.file.fileData, fileType: book.file.fileType });
  } catch (err) {
    console.log(err);
    console.log("Error Here");
    res.status(500).send(err);
  } finally {
    mongoose.connection.close();
  }
});


app.listen(3000, '0.0.0.0', function() {
  console.log("Server started on port 3000");
});

