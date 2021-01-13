const functions = require("firebase-functions");
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('<html><body><h1>slack-garage-sale</h1></body></html>');
});

exports.app = functions.https.onRequest(app);

