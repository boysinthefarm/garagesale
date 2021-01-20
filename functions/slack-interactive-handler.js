module.exports = ({ functions }) => {
  return async (req, res) => {
    const { payload } = req.body;
    functions.logger.log('--- req.body.payload ---', payload);
    res.status(200);
    res.json({
      response_action: 'clear',
    });
  };
};

