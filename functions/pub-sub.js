const { pubsub } = require('firebase-functions');

const TOPIC = {
  HELLO: 'hello',
};

exports.TOPIC = TOPIC;

exports.helloPubSub = pubsub.topic('hello').onPublish((message) => {
  functions.logger.log('---- helloPubSub ----', message);
});
