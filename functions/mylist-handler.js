const { db, webClientBot } = require('./utils');
const { getPostBlock, myPostActionButtons } = require('./block-kits');
const { PostsApi } = require('./db-api');

const getMylistBlocks = async ({ userId }) => {
  // these two requests should be parallel
  const userInfo = await webClientBot.users.info({ user: userId });
  const {
    userInfo: {
      user: {
        team_id: teamId,
      },
      profile: {
        display_name: displayName,
      }
    },
  } = userInfo;

  const postsApi = new PostsApi({ userId,  teamId });
  const posts = await postsApi.where('seller', '==', userId).get();

  let blocks = [];
  posts.forEach(doc => {
    const buttons = myPostActionButtons(doc);
    blocks = blocks.concat(getPostBlock({
      ...doc.data(),
      display_name: displayName,
    }, buttons ? [buttons] : undefined));
  });

  return blocks;
};

const mylistHandler = async (req, res) => {
  const { user_id: userId, team_id: teamId  } = req.body;
  const blocks = await getMylistBlocks({ userId, teamId });
  res.send({
    response_type: 'in_channel',
    blocks,
  });
};

module.exports = {
  getMylistBlocks,
  mylistHandler,
};

