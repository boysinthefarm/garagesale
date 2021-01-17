const functions = require("firebase-functions");
const express = require('express');
const app = express();
const { WebClient } = require('@slack/web-api');

app.get('/', (req, res) => {
    res.send('<html><body><h1>slack-garage-sale</h1></body></html>');
});

const webClient = new WebClient(functions.config().slack.token);

exports.slackBot = functions.https.onRequest(async (req, res) => {
  functions.logger.log('--- request body ---', req.body);
  /* sample req.body:
    body: {
      token: 'h9d56Htt77MSFNEcFeLMEh9t',
      team_id: 'T01JY8V5675',
      api_app_id: 'A01JV09J6MT',
      event: {
        client_msg_id: '7b7fb91f-fda2-4e16-a1fc-c10c2a64d61a',
        type: 'app_mention',
        text: '<@U01KMTTUJTA>',
        user: 'U01KMTKK9FA',
        ts: '1610844161.005500',
        team: 'T01JY8V5675',
        blocks: [Array],
        channel: 'C01KMTL9UUQ',
        event_ts: '1610844161.005500'
      },
      type: 'event_callback',
        event_id: 'Ev01K4A99TMJ',
        event_time: 1610844161,
        authorizations: [ [Object]  ],
        is_ext_shared_channel: false,
        event_context: '1-app_mention-T01JY8V5675-C01KMTL9UUQ'
    }
  */

  await webClient.chat.postMessage({
    channel: req.body.event.channel,
    text: `A message from Garage Sale!! ${Date.now()}`,
  });

  res.sendStatus(200);
});

exports.app = functions.https.onRequest(app);

