const functions = require('firebase-functions');
const { InstallProvider } = require('@slack/oauth');
const { logger } = require('./utils');

const {
  client_id: clientId,
  client_secret: clientSecret,
} = functions.config().slack;

// initialize the installProvider
const installer = new InstallProvider({ clientId, clientSecret });

module.exports = (req, res) => {
  logger.log('---- redirect ----', req.body);
  installer.handleCallback(req, res);
};

