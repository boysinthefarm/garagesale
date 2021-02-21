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

  const blocks = await Promise.all([
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    divider,
    listCommandBlock({ userId, teamId }).then(block => ...block),
    headerBlock('Your Lemonade Stand :lemon:'),
    divider,
    getMylistBlocks({ userId, teamId }).then(block => ...block),
    headerBlock('Your Sold Items :moneybag:'),
    divider,
    getMyListHistoryBlocks({ userId, teamId }).then(block => ...block),
  ]);

  logger.log('renderHomeTab blocks', blocks);

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

