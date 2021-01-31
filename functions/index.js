const fetch = require('node-fetch');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const app = express();
const { WebClient } = require('@slack/web-api');

const slackCommandHandlerFactory = require('./slack-command-handler');
const slackEvents = require('./slack-events');
const slackInteractive = require('./slack-interactive');

app.get('/', (req, res) => {
    res.send('<html><body><h1>slack-garage-sale</h1></body></html>');
});
exports.app = functions.https.onRequest(app);

exports.slackBot = functions.https.onRequest(slackEvents);

exports.slackInteractive = functions.https.onRequest(slackInteractive);

exports.slackCommand = functions.https.onRequest(slackCommandHandlerFactory());

