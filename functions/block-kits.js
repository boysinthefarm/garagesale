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
const myPostActionButtons = ({ postId }) => {
  return {
    type: "actions",
    elements: [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Mark as Sold :tada:",
          "emoji": true
        },
        "style": "danger",
        "value": postId,
        "action_id": "mark_as_sold"
      }
    ]
  };
};

const getPostBlock = ({
  display_name,
  title,
  description,
  price,
  date_posted,
  image,
}, appendable = []) => {
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

  return [
    currentPost,
    ...appendable,
    divider,
  ];
};

module.exports = {
  getPostBlock,
  buyButton,
  myPostActionButtons,
};

