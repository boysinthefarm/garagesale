const {
  divider,
  headerBlock,
  listCommandBlock,
} = require('./block-kits');
const { getMylistBlocks, getMyListHistoryBlocks } = require('./mylist-handler');
const { botClientFactory } = require('./slack-installer');

async function renderHomeTab(auth) {
  const client = await botClientFactory(auth);
  const { userId, teamId } = auth;

  const blocks = await Promise.all([
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

