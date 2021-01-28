const { db, webClientBot } = require('./utils');
const getPostBlock = require('./block-kits');

module.exports = async (req, res) => {
  // these two requests should be parallel
  const userInfo = await webClientBot.users.info({ user: req.body.user_id });
  const posts = await db.collection('posts').where('seller', '==', user).get();

  const blocks = [];
  posts.forEach(doc => {
    blocks = blocks.concat(getPostBlock({
      ...doc.data(),
      display_name: userInfo.user.profile.display_name,
    }));
  });

  res.send({
    response_type: 'in_channel',
    blocks,
  });
};

