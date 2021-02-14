const express = require('express');
const functions = require('firebase-functions');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { db, logger, webClientBot } = require('./utils');
const triggerSellModal = require('./trigger-sell-modal');
const { getMylistBlocks, getMyListHistoryBlocks } = require('./mylist-handler');
const { admin, PostsApi } = require('./db-api');
const { getPostBlock, getMrkdwnBlock, listCommandBlock } = require('./block-kits');

const slackInteractions = createMessageAdapter(functions.config().slack.signing_secret);

slackInteractions.action({ actionId: 'give_permission' }, () => {});

// handler for when user clicks on the button to "Sell This Item!"
slackInteractions.action({ actionId: 'sell_this_item' }, (payload, respond) => {
  logger.log('--- sell_this_item ----', payload);
  const imageUrl = payload.actions[0].value;

  triggerSellModal(payload.trigger_id, { imageUrl });
});

slackInteractions.action({ actionId: 'mark_as_sold' }, async (payload, respond) => {
  logger.log('--- mark_as_sold ---', payload);
  const { user } = payload;
  const postId = payload.actions[0].value;

  const postsApi = new PostsApi({ userId: user.id, teamId: user.team_id });
  await postsApi.doc(postId).update({ sold: true });
  const blocks = await getMylistBlocks({ userId: user.id, teamId: user.team_id });

  respond({
    replace_original: true,
    blocks,
  });
});

slackInteractions.action({ actionId: 'buy_message_seller' }, async (payload, respond) => {
  logger.log('--- buy_message_seller ---', payload);

  const { user: { id: buyer, team_id: teamId } } = payload;
  const postsApi = new PostsApi({ userId: buyer, teamId });

  // get the post the buyer is interested in
  const post = await postsApi.doc(payload.actions[0].value).get();
  const { seller } = post.data();

  // create a multi-party conversation among buyer, seller, and garage sale bot
  const { channel: { id: channel } } = await webClientBot.conversations.open({
    users: `${buyer},${seller}`,
  });

  // post a message in that multi-party conversation to notify the seller that
  // buyer is interested in the item
  webClientBot.chat.postMessage({
    channel,
    blocks: [
      getMrkdwnBlock(`Hi <@${seller}> :wave: \n <@${buyer}> wants to buy your item!`),
      ...getPostBlock({
        ...post.data(),
        display_name: 'You',
      }),
    ],
  });

  // replace the clicked button with a confirmation
  respond({
    replace_original: true,
    blocks: await listCommandBlock({
      userId: buyer, teamId, markAsBuyMessageSent: post.id,
    }),
  });
});

// user submits the modal to finish the sell item flow and create a post
slackInteractions.viewSubmission('sell_modal', async (payload) => {
  logger.log('--- sell_modal ---', payload);
 
  // given a modal submission payload, return the image url
  const getImageUrl = (payload) => {
    return payload.view.blocks.find(block => block.image_url).image_url;
  };

  // extract data out of the submitted form
  const formData = Object.values(payload.view.state.values).reduce((accum, current) => {
    return Object.assign(accum, current);
  }, {});

  // insert new post to db
  await db.collection('posts').add({
    date_posted: admin.firestore.Timestamp.now(),
    seller: payload.user.id,
    team: payload.user.team_id,
    price: formData.price.value,
    title: formData.title.value,
    description: formData.description.value,
    image: getImageUrl(payload),
    sold: false,
  });
});

const slackInteractiveApp = express();
slackInteractiveApp.use('/', slackInteractions.expressMiddleware());

module.exports = slackInteractiveApp;

