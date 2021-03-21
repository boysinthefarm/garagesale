const express = require('express');
const functions = require('firebase-functions');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { logger } = require('./utils');
const triggerSellModal = require('./trigger-sell-modal');
const { db, admin, PostsApi } = require('./db-api');
const { getPostBlock, getMrkdwnBlock, listCommandBlock } = require('./block-kits');
const { renderHomeTab } = require('./home-tab');
const { botClientFactory } = require('./slack-installer');
const TOPIC = require('./pub-sub/topic');
const { publishJSON } = require('./pub-sub/client'); 

const slackInteractions = createMessageAdapter(functions.config().slack.signing_secret);

slackInteractions.action({ actionId: 'give_permission' }, () => {});

// handler for when user clicks on the button to "Sell This Item!"
slackInteractions.action({ actionId: 'sell_this_item' }, async (payload, respond) => {
  logger.log('--- sell_this_item ----', payload);
  const imageUrl = payload.actions[0].value;

  await triggerSellModal(payload, { imageUrl });
});

slackInteractions.action({ actionId: 'mark_as_sold' }, async (payload, respond) => {
  logger.log('--- mark_as_sold ---', payload);
  const { user } = payload;
  const postId = payload.actions[0].value;

  const postsApi = new PostsApi({ userId: user.id, teamId: user.team_id });
  await postsApi.doc(postId).update({ sold: true });

  // update everyone's home tab
  publishJSON(TOPIC.PUBLISH_HOME_TAB, { teamId: user.team_id });
});

slackInteractions.action({ actionId: 'delete_post' }, async (payload, respond) => {
  logger.log('--- delete_post ---', payload);
  const { user } = payload;
  const postId = payload.actions[0].value;

  const postsApi = new PostsApi({ userId: user.id, teamId: user.team_id });
  await postsApi.doc(postId).update({
    deleted_at: admin.firestore.Timestamp.now(),
  });

  // update everyone's home tab
  publishJSON(TOPIC.PUBLISH_HOME_TAB, { teamId: user.team_id });
});

slackInteractions.action({ actionId: 'buy_message_seller' }, async (payload, respond) => {
  logger.log('--- buy_message_seller ---', payload);

  const { user: { id: buyer, team_id: teamId } } = payload;

  const client = await botClientFactory({
    isEnterpriseInstall: payload.is_enterprise_install,
    // enterpriseId: xxx
    teamId,
    userId: buyer,
  });

  const postsApi = new PostsApi({ userId: buyer, teamId });

  // get the post the buyer is interested in
  const post = await postsApi.doc(payload.actions[0].value).get();
  const { seller } = post.data();

  // create a multi-party conversation among buyer, seller, and garage sale bot
  const { channel: { id: channel } } = await client.conversations.open({
    users: `${buyer},${seller}`,
  });

  // post a message in that multi-party conversation to notify the seller that
  // buyer is interested in the item
  await client.chat.postMessage({
    channel,
    blocks: [
      getMrkdwnBlock(`Hi <@${seller}> :wave: \n <@${buyer}> wants to buy your item!`),
      ...getPostBlock({
        ...post.data(),
        display_name: 'You',
      }),
    ],
  });
});

// user submits the modal to finish the sell item flow and create a post
slackInteractions.viewSubmission('sell_modal', async (payload) => {
  logger.log('--- sell_modal ---', payload);
  const { user: { id: userId } } = payload;
 
  // given a modal submission payload, return the image url
  const getImageUrl = (payload) => {
    return payload.view.blocks.find(block => block.image_url).image_url;
  };

  // extract data out of the submitted form
  const formData = Object.values(payload.view.state.values).reduce((accum, current) => {
    return Object.assign(accum, current);
  }, {});

  // the data that will go into db
  const postData = {
    date_posted: admin.firestore.Timestamp.now(),
    seller: userId,
    team: payload.user.team_id,
    price: formData.price.value,
    title: formData.title.value,
    description: formData.description.value,
    image: getImageUrl(payload),
    sold: false,
  };


  // insert new post to db
  await db.collection('posts').add(postData);

  // update everyone's home tab
  publishJSON(TOPIC.PUBLISH_HOME_TAB, { teamId: payload.user.team_id });

  const client = await botClientFactory({
    isEnterpriseInstall: payload.is_enterprise_install,
    // enterpriseId: xxx
    teamId: payload.team.id,
    userId,
  });

  const userInfo = await client.users.info({ user: userId });
  const postBlock = getPostBlock({
    ...postData,
    display_name: userInfo.user.profile.display_name,
  });

  client.chat.postMessage({
    channel: userId,
    text: 'Your item has been successfully posted :tada:',
  });

  // message everyone in the team about the new post
  publishJSON(TOPIC.MESSAGE_EVERYONE, {
    messageType: 'new_item_notification',
    teamId: payload.team.id,
    data: {
      text: 'A new item has been posted for sale!',
      blocks: postBlock,
    },
  });
});

slackInteractions.action({ actionId: 'disable_new_item_notification' }, async (payload, respond) => {
  logger.log('--- disable_new_item_notification ----', payload);
  const { user: { id: userId, team_id: teamId } } = payload;
  const { value } = payload.actions[0];
  await db.collection('users').doc(userId).set({
    newItemNotificationDisabled: value === 'disable',
  }, { merge: true });

  // update user's home tab
  publishJSON(TOPIC.PUBLISH_HOME_TAB, { teamId, userId });
});

slackInteractions.action({ actionId: 'refresh_home_tab' }, async (payload, respond) => {
  logger.log('--- refresh_home_tab ----', payload);
  const { user: { id: userId, team_id: teamId } } = payload;
  // update user's home tab
  publishJSON(TOPIC.PUBLISH_HOME_TAB, { teamId, userId });
});

slackInteractions.action({ actionId: 'view_image' }, async (payload, respond) => {
  logger.log('--- view_image ----', payload);
  const { trigger_id, user: { id: userId, team_id: teamId } } = payload;
  const { value } = payload.actions[0];
  const client = await botClientFactory({ teamId });
  return client.views.open({
    trigger_id,
    view: {
      "type": "modal",
      "title": {
        "type": "plain_text",
        "text": "Image",
        "emoji": true
      },
      "blocks": [{
        "type": "image",
        "image_url": value,
        "alt_text": "image",
      }],
    },
  });
});

const slackInteractiveApp = express();
slackInteractiveApp.use('/', slackInteractions.expressMiddleware());

module.exports = slackInteractiveApp;

