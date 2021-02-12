const { logger } = require('./utils');

module.exports = (req, res) => {
  logger.log('---- redirect ----', req.body);
};

