const { getPostBlock, myPostActionButtons, getMrkdwnBlock } = require('./block-kits');
const { db, PostsApi } = require('./db-api');

const getMylistBlocks = async ({ userId, teamId }) => {
  const postsApi = new PostsApi({ userId,  teamId });
  const posts = await postsApi
    .where('seller', '==', userId)
    .where('sold', '==', false)
    .getOrdered();

  let blocks = [];

  // handle empty state
  if (posts.empty) {
    return [getMrkdwnBlock('You have not listed any items! Please refer to Message or About tab for any guidance.')];
  }

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
  const { user_id: userId, team_id: teamId } = req.body;
  const blocks = await getMylistBlocks({ userId, teamId });
  res.send({
    response_type: 'in_channel',
    blocks,
  });
};


const getMyListHistoryBlocks = async (auth) => {
  const postsApi = new PostsApi(auth);
  // get items that are sold by the current user (sell history)
  const posts = await postsApi
    .where('seller', '==', userId)
    .where('sold', '==', true)
    .getOrdered();

  let blocks = [];

  // handle empty state
  if (posts.empty) {
    return [getMrkdwnBlock('Once you mark an item as sold, it will appear here!')];
  }

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

