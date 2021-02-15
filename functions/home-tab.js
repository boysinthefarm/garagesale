const {
  divider,
  headerBlock,
  listCommandBlock,
} = require('./block-kits');
const { getMylistBlocks, getMyListHistoryBlocks } = require('./mylist-handler');
const { botClientFactory } = require('./slack-installer');

async function renderHomeTab(event) {
  const { user: userId } = event;

  const client = await botClientFactory({ userId });
  const {
    user: {
      team_id: teamId,
    }
  } = await client.users.info({ user: userId });

  const blocks = [
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    ...await listCommandBlock({ userId, teamId }),
    divider,
    headerBlock('Your Lemonade Stand :lemon:'),
    ...await getMylistBlocks({ userId, teamId }),
    divider,
    headerBlock('Your Sold Items :moneybag:'),
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

