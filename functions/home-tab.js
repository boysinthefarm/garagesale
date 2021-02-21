const {
  divider,
  headerBlock,
  listCommandBlock,
} = require('./block-kits');
const { getMylistBlocks, getMyListHistoryBlocks } = require('./mylist-handler');
const { botClientFactory } = require('./slack-installer');
const { logger } = require('./utils');

async function renderHomeTab(auth) {
  const client = await botClientFactory(auth);
  const { userId, teamId } = auth;

  let blocks = await Promise.all([
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    divider,
    listCommandBlock({ userId, teamId }),
    headerBlock('Your Lemonade Stand :lemon:'),
    divider,
    getMylistBlocks({ userId, teamId }),
    headerBlock('Your Sold Items :moneybag:'),
    divider,
    getMyListHistoryBlocks({ userId, teamId }),
  ]);

  // need to remove nesting on some of the elements
  blocks = blocks.flat();

  return client.views.publish({
    user_id: userId,
    view: {
      type: 'home',
      blocks,
    },
  });
};

module.exports = {
  renderHomeTab,
};

