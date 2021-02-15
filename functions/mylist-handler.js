const { db } = require('./utils');
const { getPostBlock, myPostActionButtons } = require('./block-kits');
const { PostsApi } = require('./db-api');
const { botClientFactory } = require('./slack-installer');

const getMylistBlocks = async ({ userId }) => {
  const postsApi = new PostsApi({ userId,  teamId });
  const client = await botClientFactory({ userId });

  const [posts, userInfo] = await Promise.all([
    // get items that are not sold yet listed by the current user
    postsApi.where('seller', '==', userId).where('sold', '==', false).getOrdered(),
    client.users.info({ user: userId }),
  ]);

  const {
    user: {
      team_id: teamId,
      profile: {
        display_name: displayName,
      },
    },
  } = userInfo;

  let blocks = [];
  posts.forEach(doc => {
    const buttons = myPostActionButtons(doc);
    blocks = blocks.concat(getPostBlock({
      ...doc.data(),
      display_name: 'You',
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


const getMyListHistoryBlocks = async ({userId }) => {
  const client = await botClientFactory({ userId });
  const userInfo = await client.users.info({user : userId});
  const {
    user: {
      team_id: teamId,
      profile: {
        display_name: displayName,
      },
    },
  } = userInfo;

  const postsApi = new PostsApi({ userId,  teamId });
  // get items that are sold by the current user (sell history)
  const posts = await postsApi
    .where('seller', '==', userId)
    .where('sold', '==', true)
    .getOrdered();

  let blocks = [];
  posts.forEach(doc => {
    const buttons = myPostActionButtons(doc);
    blocks = blocks.concat(getPostBlock({
      ...doc.data(),
      display_name: 'You',
    }, buttons ? [buttons] : undefined));
  });

  return blocks;
};



module.exports = {
  getMylistBlocks,
  getMyListHistoryBlocks,
  mylistHandler,
};

