const functions = require('firebase-functions');
const { WebClient } = require('@slack/web-api');
const { db } = require('./db-api');

const APP_NAME = 'Lemonade';

const {
  token,
  user_token: userToken,
} = functions.config().slack;

module.exports = {
  APP_NAME,
  logger: functions.logger,
  db,
};

