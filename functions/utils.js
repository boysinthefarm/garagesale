const functions = require('firebase-functions');
const { db } = require('./db-api');

const APP_NAME = 'Lemonade';

module.exports = {
  APP_NAME,
  logger: functions.logger,
  db,
};

