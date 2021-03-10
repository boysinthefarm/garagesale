const functions = require('firebase-functions');
const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const engines = require('consolidate');
const { generateInstallUrl } = require('./slack-installer');
const { APP_NAME } = require('./utils');

const {
  messageEveryone,
  publishHomeTab,
} = require('./pub-sub/handlers');

const slackCommandHandler = require('./slack-command-handler');
const slackEvents = require('./slack-events');
const slackInteractive = require('./slack-interactive');
const slackRedirect = require('./slack-redirect');

const installUrl = generateInstallUrl();
  
const web = express();
web.engine('hbs', engines.handlebars);
web.set('views', './views');
web.set('view engine', 'hbs');

web.get('/', async(req, res) => {
  res.render('index', {
    installUrl: await installUrl,
    APP_NAME,
  });
});

exports.web = functions.https.onRequest(web);

// use this handler when registering a new endpoint with slack
const handleSlackChallenge = (req, res) => res.send({ challenge: req.body.challenge });

exports.slackEvents = functions.https.onRequest(slackEvents);

exports.slackInteractive = functions.https.onRequest(slackInteractive);

exports.slackCommand = functions.https.onRequest(slackCommandHandler);

exports.slackRedirect = functions.https.onRequest(slackRedirect);

exports.messageEveryone = messageEveryone;

exports.publishHomeTab = publishHomeTab;

