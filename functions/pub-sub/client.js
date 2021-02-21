const { PubSub } = require('@google-cloud/pubsub');

const pubsubClient = new PubSub();

exports.publishJSON = (topic, data) => {
  return pubsubClient.topic(topic).publish(Buffer.from(JSON.stringify(data)));
};
