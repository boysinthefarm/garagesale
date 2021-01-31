let divider = { type: 'divider' };
let buyButton = {
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
      "value": "button_clicked",
      // must be unique - need a way to address this
      "action_id": "actionId-0"
    }
  ]
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
  let currentPost = [{
    "type" : "section",
    "text" : {
      "type": "mrkdwn",
      "text" : `${display_name} listed *${title}* for $${price} on ${date_posted.toDate()} \n :star: ${description}`
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

module.exports = {
  getPostBlock,
  buyButton,
  myPostActionButtons,
};

