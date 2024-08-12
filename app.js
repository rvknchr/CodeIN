
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

app.get("/home", function(req, res) {
  res.render("home");
});

app.get("/books", async function(req, res) {
  try {
    await connectDB();
    const JavaBook = createBookModel('Python');
    const books = await JavaBook.find().select('name authors rating subject');
    res.render("bodyBooks", { books: books });
  } catch (err) {
    res.status(500).send(err);
  } finally {
    mongoose.connection.close();
  }
});

app.get("/books/:bookName", async function(req, res) {
  try {
    await connectDB();
    const JavaBook = createBookModel('Python');
    console.log(req.params.bookName);
    const book = await JavaBook.findOne({ name: req.params.bookName });
    console.log(book);
    res.render("book1", { fileData: book.file.fileData, fileType: book.file.fileType });
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

