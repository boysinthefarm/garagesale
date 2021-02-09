const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { WebClient } = require('@slack/web-api');

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

// slack api interface
// with bot credentials
const webClientBot = new WebClient(functions.config().slack.token);
// with user credentials
const webClientUser = new WebClient(functions.config().slack.user_token);

module.exports = {
  admin,
  logger: functions.logger,
  db,
  webClientBot,
  webClientUser,
};

