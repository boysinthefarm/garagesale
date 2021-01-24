const fetch = require('node-fetch');
const functions = require('firebase-functions');

const makeModal = ({ imageUrl }) => {
  return {
    "type": "modal",
    "title": {
      "type": "plain_text",
      "text": "Sell",
      "emoji": true
                    
    },
    "submit": {
      "type": "plain_text",
      "text": "Submit",
      "emoji": true
    },
    "close": {
      "type": "plain_text",
      "text": "Cancel",
      "emoji": true
    },
    "blocks": [
      {
        "type": "image",
        "image_url": imageUrl, 
        "alt_text": "alt"
      },
      {
        "type": "input",
        "element": {
          "type": "plain_text_input",
          "action_id": "title"
        },
        "label": {
          "type": "plain_text",
          "text": "Item Name",
          "emoji": true
        }
      },
      {
        "type": "input",
        "element": {
          "type": "plain_text_input",
          "action_id": "price"
        },
        "label": {
          "type": "plain_text",
          "text": "Price",
          "emoji": true
        }
      },
      {
        "type": "input",
        "element": {
          "type": "plain_text_input",
          "multiline": true,
          "action_id": "description"
        },
        "label": {
          "type": "plain_text",
          "text": "Description",
          "emoji": true
        }
      }
    ]
  }
};

const triggerSellModal = (trigger_id, modalData) => {
  return fetch('https://slack.com/api/views.open', {
    method: 'post',
    body: JSON.stringify({
      trigger_id,
      view: makeModal(modalData),
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${functions.config().slack.token}`,
    },
  });
};

module.exports = triggerSellModal;

