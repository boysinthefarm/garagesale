const { logger } = require('./utils');
const { installer } = require('./slack-installer');

module.exports = (req, res) => {
  logger.log('---- redirect ----', req);
  installer.handleCallback(req, res);
};

