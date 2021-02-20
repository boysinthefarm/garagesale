const { pubsub } = require('firebase-functions');
const TOPIC = require('./topic');
const { logger } = require('./../utils');

exports.helloPubSub = pubsub.topic(TOPIC.hello).onPublish((message) => {
  logger.log('---- helloPubSub ----', message.json);
  return null;
});
