const functions = require('firebase-functions');
const TOPIC = require('./topic');
const { botClientFactory } = require('./../slack-installer');
const { logger } = require('./../utils');
const { db } = require('./../db-api');
const { renderHomeTab } = require('../home-tab');
const { getMrkdwnBlock } = require('../block-kits');

const pubsub = functions.pubsub;

exports.messageSellInstruction = pubsub.topic(TOPIC.MESSAGE_SELL_INSTRUCTION).onPublish(async(message) => {
  const { teamId, userId } = message.json;
  if (!teamId || !userId) {
    throw new Error('teamId or userId missing');
  }

  const client = await botClientFactory({ teamId, userId });
  const text = 'Send a message here with an image attachment to start selling!';
  return client.chat.postMessage({
    channel: userId,
    text,
    blocks: [getMrkdwnBlock(
      text,
      { block_id: `sell_instruction_${Date.now()}` },
    )],
  });
});

exports.messageEveryone = pubsub.topic(TOPIC.MESSAGE_EVERYONE).onPublish(async(message) => {
  const { messageType, teamId, data } = message.json;
  if (!teamId || typeof data !== 'object') {
    logger.error('this message failed:', message);
    throw new Error('teamId or data missing');
  }

  const client = await botClientFactory({ teamId });
  const { members } = await client.users.list({ team_id: teamId });
  let users = members.filter(member => !member.is_bot).map(user => user.id);

  // for new_item_notification, filter out users that opted out
  if (messageType === 'new_item_notification') {
    // query db for users that have explicitly enabled notification
    const snapshot = await db.collection('users').where('newItemNotificationEnabled', '==', true).get();
    if (snapshot.empty) {
      // nobody has enabled notification
      users = [];
    } else {
      const enabledUsers = {};
      snapshot.forEach(doc => enabledUsers[doc.id] = true);
      users = users.filter(userId => enabledUsers[userId]);
    }
  }

  return Promise.all(users.map((userId) => {
    return client.chat.postMessage({
      channel: userId,
      ...data,
    });
  }));
});

exports.publishHomeTab = pubsub.topic(TOPIC.PUBLISH_HOME_TAB).onPublish(async(message) => {
  const { teamId, userId } = message.json;
  if (!teamId) {
    logger.error('this message failed:', message);
    throw new Error('teamId missing');
  }

  const client = await botClientFactory({ teamId });

  let usersToUpdate = [];
  // if userId is provided, then just target single user
  // else target all users in the team
  if (userId) {
    usersToUpdate = [{ id: userId }];
  } else {
    const { members: users } = await client.users.list({ team_id: teamId });
    usersToUpdate = users.filter(user => !user.is_bot);
  }

  logger.log('publishHomeTab', teamId, usersToUpdate.map(user => user.id));

  return Promise.all(usersToUpdate.map((user) => {
    return renderHomeTab({
      teamId,
      userId: user.id,
      botClient: client,
    });
  }));

});

