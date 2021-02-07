const commaNumber = require('comma-number');
const { PostsApi } = require('./db-api');
const { webClientBot, logger } = require('./utils');

let divider = { type: 'divider' };

const getMrkdwnBlock = (text) => {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text,
    },
  };
};

const listPostActionButtons = (doc) => {
  return {
    "type": "actions",
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
      }
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
  const posts = await postsApi.where('sold', '==', false).get();

  let blocks = [];
  const userInfoPromises = [];

  posts.forEach(doc => {
    userInfoPromises.push(new Promise(async (resolve) => {
      const { title, price, seller, description, date_posted, sold, image } = doc.data();
      const userInfo = await webClientBot.users.info({ user: seller });

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

module.exports = {
  listCommandBlock,
  getMrkdwnBlock,
  getPostBlock,
  listPostActionButtons,
  myPostActionButtons,
};

