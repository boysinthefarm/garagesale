const { botClientFactory } = require('./slack-installer');

const makeModal = ({ imageUrl }) => {
  return {
    callback_id: 'sell_modal',
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

const triggerSellModal = ({ trigger_id, user: { team_id: teamId }}, modalData) => {
  const client = await botClientFactory({ teamId });
  return client.views.open({
    trigger_id,
    view: makeModal(modalData),
  });
};

module.exports = triggerSellModal;

