const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { WebClient } = require('@slack/web-api');

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const webClientBot = new WebClient(functions.config().slack.token);
const webClientUser = new WebClient(functions.config().slack.user_token);

module.exports = {
  logger: functions.logger,
  db,
  webClientBot,
  webClientUser,
};

