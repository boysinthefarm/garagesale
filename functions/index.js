const functions = require('firebase-functions');
const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const { generateInstallUrl } = require('./slack-installer');
const { APP_NAME } = require('./utils');

const { messageEveryone } = require('./pub-sub/handlers');

const slackCommandHandler = require('./slack-command-handler');
const slackEvents = require('./slack-events');
const slackInteractive = require('./slack-interactive');
const slackRedirect = require('./slack-redirect');

const imgAddToSlack = '<img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />';
const web = express();
web.get('/', async(req, res) => {
  const url = await generateInstallUrl();

  res.send(`<html><body>
    <h1>${APP_NAME}</h1>
    <a href="${url}">${imgAddToSlack}</a>
  </body></html>`);
});
exports.web = functions.https.onRequest(web);

exports.slackBot = functions.https.onRequest(slackEvents);

exports.slackInteractive = functions.https.onRequest(slackInteractive);

exports.slackCommand = functions.https.onRequest(slackCommandHandler);

exports.slackRedirect = functions.https.onRequest(slackRedirect);

exports.helloPubSub = helloPubSub;
exports.messageEveryone = messageEveryone;
