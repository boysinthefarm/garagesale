module.exports = ({ functions, db }) => {
  return async (req, res) => {
    const { payload } = req.body;
    functions.logger.log('--- req.body.payload ---', payload);
    const formData = Object.values(payload.values).reduce((accum, current) => {
      return Object.assign(accum, current);
    }, {});

    await db.collection('posts').add({
      price: formData.price.value,
      title: formData.title.value,
      description: formData.description.value,
    });

    res.status(200);
    res.json({
      response_action: 'clear',
    });
  };
};

