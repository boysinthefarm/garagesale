let divider = { type: 'divider' };

const getPostBlock = ({
  display_name,
  title,
  description,
  price,
  date_posted,
  image,
}) => {
  let currentPost = {
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
  };

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

  return [
    currentPost,
    buyButton,
    divider,
  ];

};

module.exports = {
  getPostBlock,
};

