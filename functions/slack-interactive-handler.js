const triggerSellModal = require('./trigger-sell-modal');
const { admin, db } = require('./utils');

const sellThisItemHandler = (trigger_id, action) => {
  triggerSellModal(trigger_id, {
    imageUrl: action.value,
  });
};

const markAsSold = async (action) => {
  await db.collection('posts').doc(action.value).update({ sold: true });
};

const blockActionsHandler = (payload) => {
  payload.actions.forEach((action) => {
    const { action_id } = action;
    if (action_id === 'sell_this_item') {
      sellThisItemHandler(payload.trigger_id, action);
    } else if (action_id === 'mark_as_sold') {
      markAsSold(action);
    }
  });
};

// given a modal submission payload, return the image url
const getImageUrl = (payload) => {
  return payload.view.blocks.find(block => block.image_url).image_url;
};

module.exports = ({ functions, db }) => {
  return async (req, res) => {
    const payload = JSON.parse(req.body.payload);
    functions.logger.log('--- req.body---', req.body);
    functions.logger.log('--- req.body.payload ---', payload);

    res.status(200);

    if (payload.type === 'view_submission' && payload.view.title.text === 'Sell') {
      const formData = Object.values(payload.view.state.values).reduce((accum, current) => {
        return Object.assign(accum, current);
      }, {});

      await db.collection('posts').add({
        date_posted: admin.firestore.Timestamp.now(),
        seller: payload.user.id,
        team: payload.user.team_id,
        price: formData.price.value,
        title: formData.title.value,
        description: formData.description.value,
        image: getImageUrl(payload),
      });
      res.json({
        response_action: 'clear',
      });
    } else if (payload.type === 'block_actions') {
      blockActionsHandler(payload);
      res.json({ ok: true });
    }
  };
};

