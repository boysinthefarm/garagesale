const functions = require('firebase-functions');
const TOPIC = require('./topic');
const { botClientFactory } = require('./../slack-installer');
const { logger } = require('./../utils');
const { renderHomeTab } = require('../home-tab');

const pubsub = functions.pubsub;

exports.messageEveryone = pubsub.topic(TOPIC.MESSAGE_EVERYONE).onPublish(async(message) => {
  const { teamId, data } = message.json;
  if (!teamId || typeof data !== 'object') {
    logger.error('this message failed:', message);
    throw new Error('teamId or data missing');
  }

  const client = await botClientFactory({ teamId });
  const { members } = await client.users.list({ team_id: teamId });
  const nonBotMembers = members.filter(member => !member.is_bot);

  return Promise.all(nonBotMembers.map((member) => {
    return client.chat.postMessage({
      channel: member.id,
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
    });
  }));

});

