const { getPostBlock, myPostActionButtons, getMrkdwnBlock } = require('./block-kits');
const { db, PostsApi } = require('./db-api');
const { botClientFactory } = require('./slack-installer');

const getMylistBlocks = async ({ userId, teamId }) => {
  const postsApi = new PostsApi({ userId,  teamId });
  const client = await botClientFactory({ teamId, userId });

  const [posts, userInfo] = await Promise.all([
    // get items that are not sold yet listed by the current user
    postsApi.where('seller', '==', userId).where('sold', '==', false).getOrdered(),
    client.users.info({ user: userId }),
  ]);

  const {
    user: {
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

  // handle empty state
  if (blocks == []) {
    blocks = [getMrkdwnBlock('You have not listed any items! Please refer to Message or About tab for any guidance.')];
  }
  return blocks;
};


const mylistHandler = async (req, res) => {
  const { user_id: userId, team_id: teamId } = req.body;
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
  // handle empty state
  if (blocks == []) {
    blocks = [getMrkdwnBlock('Once you mark an item as sold, it will appear here!')];
  }
  return blocks;
};



module.exports = {
  getMylistBlocks,
  getMyListHistoryBlocks,
  mylistHandler,
};

