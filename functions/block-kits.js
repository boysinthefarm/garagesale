/*
 * functions related to generating slack block kits
 */
  
const commaNumber = require('comma-number');
const { db, PostsApi } = require('./db-api');
const { APP_NAME, logger } = require('./utils');
const { generateInstallUrl, botClientFactory } = require('./slack-installer');

let divider = { type: 'divider' };

function headerBlock(text) {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
  };
}

const getMrkdwnBlock = (text, custom = {}) => {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text,
    },
    ...custom,
  };
};

const listPostActionButtons = (doc) => {
  return {
    'type': "actions",
    "elements": [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Buy & Message Seller",
          "emoji": true
        },
        "style": "primary",
        "value": doc.id,
        "action_id": 'buy_message_seller',
      },
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": ":mag: View Image",
          "emoji": true
        },
        "value": doc.data().image,
        "action_id": 'view_image',
      },
    ]
  };
};

const myPostActionButtons = (doc) => {
  const elements = [];

  if (!doc.data().sold) {
    elements.push({
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Mark as Sold :tada:",
        "emoji": true
      },
      "style": "danger",
      "value": doc.id,
      "action_id": "mark_as_sold"
    });
  }

  return elements.length ? {
    type: 'actions',
    elements,
  } : undefined;
};

const getPostBlock = ({
  display_name,
  title,
  description,
  price,
  date_posted,
  image,
  sold,
}, appendable = []) => {
  const ts = date_posted.seconds;
  const tsText = `<!date^${ts}^{date_short_pretty}|${ts}>`;

  let currentPost = [{
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${display_name} listed *${title}* for $${commaNumber(price)} on ${tsText} \n :star: ${description}`,
    },
    "accessory" : {
      "type" : "image",
      "image_url": image,
      "alt_text": title,
    }
  }];

  if (sold) {
    currentPost.push({
      type: 'context',
      elements: [{
          type: 'mrkdwn',
          text: '*Sold* :lollipop:',
        }],
    });
  }

  return [
    ...currentPost,
    ...appendable,
    divider,
  ];
};

const listCommandBlock = async ({
  userId,
  teamId,
  markAsBuyMessageSent = '', // postId
}) => {
  const postsApi = new PostsApi({ userId, teamId });

  const [posts, botClient] = await Promise.all([
    postsApi.where('sold', '==', false).where('seller', '!=', userId).getOrdered(),
    botClientFactory({ teamId }),
  ]);

  let blocks = [];
  const userInfoPromises = [];

  // handle empty state
  if (posts.empty) {
    return [getMrkdwnBlock('There are currently no items available for sale. Please come back later!')];
  }

  posts.forEach(doc => {
    userInfoPromises.push(new Promise(async (resolve) => {
      const { title, price, seller, description, date_posted, sold, image } = doc.data();
      const userInfo = await botClient.users.info({ user: seller });

      let appendable = [];
      if (markAsBuyMessageSent === doc.id) {
        appendable = [getMrkdwnBlock('Message Sent :white_check_mark:')];
      } else {
        appendable = [listPostActionButtons(doc)];
      }

      blocks = blocks.concat(getPostBlock({
        display_name: userInfo.user.profile.display_name,
        title,
        description,
        price,
        date_posted,
        image,
        sold,
      }, appendable));

      resolve();
    }));
  });


  await Promise.all(userInfoPromises);

  return blocks;
};

const sellThisItemBlock = (imageUrl) => {
  const blocks = [];
  blocks.push({
    type: 'image',
    image_url: imageUrl,
    alt_text: 'item for sale',
  });
  blocks.push({
    type: 'actions',
    elements: [{
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Sell This Item!',
        emoji: true,
      },
      value: imageUrl,
      action_id: 'sell_this_item',
    }],
  });

  return blocks;
};

function askPermissionBlock(url) {
  return [{
    block_id: `ask_permission_${Date.now()}`,
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": `To start selling, ${APP_NAME} needs permission to access your slack images.`,
    },
    "accessory": {
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Give Permission",
        "emoji": true
      },
      "value": url,
      url,
      "action_id": 'give_permission',
    }
  }];
};

async function settingsBlock(userId) {
  let newItemNotificationDisabled = false;
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    newItemNotificationDisabled = userData.newItemNotificationDisabled || false;
  }

  const newItemNotificationSection = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `New item notification *(${newItemNotificationDisabled ? 'disabled' : 'enabled'})*`,
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: newItemNotificationDisabled ? 'Enable' : 'Disable',
        emoji: true,
      },
      style: newItemNotificationDisabled ? 'primary' : undefined,
      value: newItemNotificationDisabled ? 'enable': 'disable',
      action_id: 'disable_new_item_notification',
    }
  };

  const refreshPageSection = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Refresh this page',
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Refresh',
        emoji: true,
      },
      action_id: 'refresh_home_tab',
    },
  };

  return [
    headerBlock('Settings :gear:'),
    divider,
    newItemNotificationSection,
    refreshPageSection,
  ];
};

module.exports = {
  divider,
  headerBlock,
  listCommandBlock,
  getMrkdwnBlock,
  getPostBlock,
  listPostActionButtons,
  myPostActionButtons,
  sellThisItemBlock,
  askPermissionBlock,
  settingsBlock,
};

