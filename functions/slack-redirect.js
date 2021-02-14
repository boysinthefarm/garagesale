const { logger, installer } = require('./utils');

module.exports = (req, res) => {
  logger.log('---- redirect ----', req);
  installer.handleCallback(req, res);
};

