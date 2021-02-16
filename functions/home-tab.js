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

  const blocks = [
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    divider,
    ...await listCommandBlock({ userId, teamId }),
    headerBlock('Your Lemonade Stand :lemon:'),
    divider,
    ...await getMylistBlocks({ userId, teamId }),
    headerBlock('Your Sold Items :moneybag:'),
    divider,
    ...await getMyListHistoryBlocks({ userId }),
  ];

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

