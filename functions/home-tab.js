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

  const allItems = ...await listCommandBlock({ userId, teamId });
  const myItems = ...await getMylistBlocks({ userId });
  const mySoldItems = ...await getMyListHistoryBlocks({ userId });

  // build blocks based on returned values form queries
  const blocks = [
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    divider,
  ];

  if (allItems == []) {
    const showAllItems = 'There are currently no items available for sale. Please comet back later!';
  } else {
    const showAllItems = allItems;
  }

  if (myItems == []) {
    const showMyItems = 'You have not listed any items! Please refer to Message or About tab for any guidance.';
  } else {
    const showMyItems = myItems;
  }

  if (mySoldItems == []) {
    const = showMySoldItems = 'Once you mark an item as sold, it will appear here!'
  } else {
    const showMySoldItems = mySoldItems
  }

  const blocks = [
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    showAllItems
    divider,
    headerBlock('Your Lemonade Stand :lemon:'),
    showMyItems,
    divider,
    headerBlock('Your Sold Items :moneybag:'),
    showMySoldItems,
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

