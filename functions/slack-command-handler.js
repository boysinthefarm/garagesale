const { logger } = require('./utils');

module.exports = async (req, res) => {
  logger.log('--- request body ---', req.body);
};

