const { db } = require('./utils');

module.exports = async (req, res) => {
  const user = req.body.user_id;

  const userPosts = await db.collection('posts').where('seller', '==', user).get();

  res.sendStatus(200);
};

