const functions = require('firebase-functions');
const { WebClient } = require('@slack/web-api');
const { db } = require('./db-api');

const APP_NAME = 'Lemonade';

const {
  token,
  user_token: userToken,
} = functions.config().slack;

// slack api interface
// with bot credentials
const webClientBot = new WebClient(token);
// with user credentials
const webClientUser = new WebClient(userToken);

module.exports = {
  APP_NAME,
  logger: functions.logger,
  db,
  webClientBot,
  webClientUser,
};

