const functions = require('firebase-functions');
const TOPIC = require('./topic');
const { botClientFactory } = require('./../slack-installer');
const { logger } = require('./../utils');
const { botClientFactory } = require('../slack-installer');
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

  return Promise.all(members.map((member) => {
    return client.chat.postMessage({
      channel: member.id,
      ...data,
    });
  }));
});

exports.publishHomeTab = pubsub.topic(TOPIC.PUBLISH_HOME_TAB).onPublish(async(message) => {
  const { teamId } = message.json;
  if (!teamId) {
    logger.error('this message failed:', message);
    throw new Error('teamId missing');
  }

  const client = await botClientFactory({ teamId });
  const { members } = await client.users.list({ team_id: teamId });

  logger.log('publishHomeTab', teamId, members.map(member => member.id));

  return Promise.all(members.map((member) => {
    return renderHomeTab({
      teamId,
      userId: member.id,
    });
  }));

});

