const {
  divider,
  headerBlock,
  listCommandBlock,
  settingsBlock,
  getMrkdwnBlock,
  getPostBlock,
  listPostActionButtons,
} = require('./block-kits');
const { getMylistBlocks, getMyListHistoryBlocks } = require('./mylist-handler');
const { botClientFactory } = require('./slack-installer');
const { logger } = require('./utils');

const teamPosts = async ({
  userId,
  teamId,
  botClient,
}) => {
  const postsApi = new PostsApi({ userId, teamId });
  const posts = await postsApi.where('sold', '==', false).where('seller', '!=', userId).getOrdered();

  let blocks = [];
  const userInfoPromises = [];

  // handle empty state
  if (posts.empty) {
    return [getMrkdwnBlock('There are currently no items available for sale. Please come back later!')];
  }

  posts.forEach(doc => {
    if (doc.data().deleted_at) return;
    userInfoPromises.push(new Promise(async (resolve) => {
      const { title, price, seller, description, date_posted, sold, image } = doc.data();
      const userInfo = await botClient.users.info({ user: seller });

      blocks = blocks.concat(getPostBlock({
        display_name: userInfo.user.profile.display_name,
        title,
        description,
        price,
        date_posted,
        image,
        sold,
      }, [listPostActionButtons(doc)]));

      resolve();
    }));
  });


  await Promise.all(userInfoPromises);

  return blocks;
};

async function renderHomeTab({ teamId, userId, botClient }) {
  if (!botClient) {
    botClient = await botClientFactory({ teamId, userId });
  }

  let blocks = await Promise.all([
    headerBlock('Welcome :partying_face: \n Check out the items in the marketplace! :kite:'),
    divider,
    teamPosts({ userId, teamId, botClient }),
    headerBlock('Your Garage :teddy_bear:'),
    divider,
    getMylistBlocks({ userId, teamId }),
    headerBlock('Your Sold Items :moneybag:'),
    divider,
    getMyListHistoryBlocks({ userId, teamId }),
    settingsBlock(userId),
  ]);

  // need to remove nesting on some of the elements
  blocks = blocks.flat();

  return botClient.views.publish({
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

