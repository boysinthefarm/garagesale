module.exports = ({ functions }) => {
  return async (req, res) => {
    const { payload } = req.body;
    functions.logger.log('--- req.body.payload ---', payload);
    res.sendStatus(200);
  };
};

