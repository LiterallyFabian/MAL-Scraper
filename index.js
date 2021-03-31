var scraper = require('./scraper.js');
var editor = require("./editor");
const http = require('http');
const express = require('express');
const mysql2 = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
require('dotenv').config();

app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, '')));
app.use(express.json());
app.use(express.static(__dirname + "/public",{
    extensions: ['html', 'htm']
}));
app.use(bodyParser.urlencoded({
    extended: false
}))

connection = mysql2.createConnection({
    host: process.env.mysql_host || 'localhost',
    user: process.env.mysql_user,
    password: process.env.mysql_password,
    database: process.env.mysql_database
});

connection.connect(function (e) {
    if (e) {
        return console.error('error: ' + e.message);
    }

    console.log(`\nConnected to MySQL (${process.env.mysql_database})\n`);
});

app.use('/scraper', scraper);
app.use('/editor', editor);

const port = 3000;

const server = http.createServer(app);


server.listen(port, () => {
    console.log(`I'm alive`);
});

