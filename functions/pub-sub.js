const { pubsub } = require('firebase-functions');
const { logger } = require('./utils');

const TOPIC = {
  HELLO: 'hello',
};

exports.TOPIC = TOPIC;

exports.helloPubSub = pubsub.topic('hello').onPublish((message) => {
  logger.log('---- helloPubSub ----', message.json);
});
