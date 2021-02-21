const functions = require('firebase-functions');
const TOPIC = require('./topic');
const { botClientFactory } = require('./../slack-installer');
const { logger } = require('./../utils');

const pubsub = functions.pubsub;

exports.helloPubSub = pubsub.topic(TOPIC.HELLO).onPublish((message) => {
  logger.log('---- helloPubSub ----', message.json);
  return null;
});

exports.messageEveryone = pubsub.topic(TOPIC.MESSAGE_EVERYONE).onPublish(async(message) => {
  const { teamId, data } = message.json;
  if (!teamId || typeof data === 'object') {
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

