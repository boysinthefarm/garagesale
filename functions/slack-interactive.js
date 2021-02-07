const express = require('express');
const functions = require('firebase-functions');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { db, admin, logger, webClientBot } = require('./utils');
const triggerSellModal = require('./trigger-sell-modal');
const { getMylistBlocks } = require('./mylist-handler');
const { PostsApi } = require('./db-api');
const { getPostBlock, getMrkdwnBlock, listCommandBlock } = require('./block-kits');

const slackInteractions = createMessageAdapter(functions.config().slack.signing_secret);

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
  const post = await postsApi.doc(payload.actions[0].value).get();
  const { seller } = post.data();

  const { channel: { id: channel } } = await webClientBot.conversations.open({
    users: `${buyer},${seller}`,
  });

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

  respond({
    replace_original: true,
    blocks: await listCommandBlock({
      userId: buyer, teamId, markAsBuyMessageSent: post.id,
    }),
  });
});

slackInteractions.viewSubmission('sell_modal', async (payload) => {
  logger.log('--- sell_modal ---', payload);
 
  // given a modal submission payload, return the image url
  const getImageUrl = (payload) => {
    return payload.view.blocks.find(block => block.image_url).image_url;
  };

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
    sold: false,
  });
});

const slackInteractiveApp = express();
slackInteractiveApp.use('/', slackInteractions.expressMiddleware());

module.exports = slackInteractiveApp;

