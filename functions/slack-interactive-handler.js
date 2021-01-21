module.exports = ({ functions, db, admin }) => {
  return async (req, res) => {
    const payload = JSON.parse(req.body.payload);
    functions.logger.log('--- req.body.payload ---', payload);
    const formData = Object.values(payload.view.state.values).reduce((accum, current) => {
      return Object.assign(accum, current);
    }, {});

    await db.collection('posts').add({
      date_posted: admin.firestore.Timestamp.now(),
      seller: payload.user.id,
      team: payload.user.team_id,
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

