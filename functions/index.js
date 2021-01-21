const fetch = require('node-fetch');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const app = express();
const { WebClient } = require('@slack/web-api');

const slackBotHandlerFactory = require('./slack-bot-handler');
const slackCommandHandlerFactory = require('./slack-command-handler');
const slackInteractiveHandlerFactory = require('./slack-interactive-handler');

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const webClient = new WebClient(functions.config().slack.token);

app.get('/', (req, res) => {
    res.send('<html><body><h1>slack-garage-sale</h1></body></html>');
});
exports.app = functions.https.onRequest(app);

exports.slackBot = functions.https.onRequest(slackBotHandlerFactory({ functions, webClient }));

exports.slackCommand = functions.https.onRequest(slackCommandHandlerFactory({ db, functions }));

exports.slackInteractive = functions.https.onRequest(slackInteractiveHandlerFactory({ functions, db }));

