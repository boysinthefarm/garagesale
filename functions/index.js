const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const { installer } = require('./utils');
const { generateInstallUrl } = require('./slack-installer');
const app = express();

const slackCommandHandler = require('./slack-command-handler');
const slackEvents = require('./slack-events');
const slackInteractive = require('./slack-interactive');
const slackRedirect = require('./slack-redirect');


app.get('/', async(req, res) => {
  const url = await generateInstallUrl();

  res.send(`<html><body>
    <h1>slack-garage-sale</h1>
    <a href="${url}">${url}</a>
  </body></html>`);
});
exports.app = functions.https.onRequest(app);

exports.slackBot = functions.https.onRequest(slackEvents);

exports.slackInteractive = functions.https.onRequest(slackInteractive);

exports.slackCommand = functions.https.onRequest(slackCommandHandler);

exports.slackRedirect = functions.https.onRequest(slackRedirect);
