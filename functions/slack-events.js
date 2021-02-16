const express = require('express');
const functions = require('firebase-functions');
const { WebClient } = require('@slack/web-api');
const { logger } = require('./utils');
const { db } = require('./db-api');
const {
  sellThisItemBlock,
  divider,
  getMrkdwnBlock,
  askPermissionBlock,
} = require('./block-kits');
const { botClientFactory } = require('./slack-installer');
const {
  postMessageSellInstruction,
  postMessageRequestPermission,
} = require('./post-message');
const { renderHomeTab } = require('./home-tab');

const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(
  functions.config().slack.signing_secret,
  { includeBody: true },
);

/*
 * converts slack authorization prop of slack event body to camelCase
 * param {body} event body https://slack.dev/node-slack-sdk/events-api
 */
function getAuthFromEventBody(body) {
  const auth = body.authorization;
  return {
    teamId: auth.team_id,
    isEnterpriseInstall: auth.is_enterprise_install,
    enterpriseId: auth.enterprise_id,
    userId: auth.user_id,
  };
};

// files: event.files
const getImageFiles = (files) => {
  return files.reduce((accum, current) => {
    if (current.mimetype.includes('image')) {
      accum.push(current);
    }
    return accum;
  }, []);
};

const getImagePublicLink = (image) => {
  // this is sort of a hack. This method is not found in API docs.
  const parts = image.permalink_public.split('-');
  const pub_secret = parts[parts.length - 1];

  return `${image.url_private}?pub_secret=${pub_secret}`;
};

// will make image public if not already
// returns an array of public image urls or a promise that will return public image url
const makeImagePublic = (image, webClient) => {
  if (!image.public_url_shared) {
    return webClient.files.sharedPublicURL({ file: image.id })
      .catch((error) => {
        logger.log('----- sharedPublicURL error:', error);
        if (error.message === 'already_public') {
          return getImagePublicLink(image);
        }
      })
      .then(() => getImagePublicLink(image));
  }

  return getImagePublicLink(image);
};

/**
 *
 * triggers sell flow if image file(s) is attached to event
 * @param { event } slack event
 * @returns { promise || false }
  returns either a webClient post promise
  or false if sell flow is not triggered
 */
async function triggerSellFlow(event, auth) {
  const { files, user } = event;

  // no files
  if (!files) { return false; }

  const images = getImageFiles(files);
  // no images
  if (!images.length) { return false; }

  let userRef = await db.collection('users').doc(user).get();
  if (!userRef.exists) {
    // trigger user oauth flow
    return postMessageRequestPermission(auth);
  }

  // if there are images and we have user auth token,
  // then go ahead and trigger sell flow
  if (images && userRef.exists) {
    const userClient = new WebClient(userRef.data().token);
    // filter files for images
    // wait to make sure all of the urls have become public
    const imageUrls = await Promise.all(images.map((image) => {
      return makeImagePublic(image, userClient);
    }));

    // make blocks out of image urls
    const blocks = imageUrls.flatMap(sellThisItemBlock);
    
    const botClient = await botClientFactory({ userId: user });
    return botClient.chat.postEphemeral({
      channel: event.channel,
      user: event.user,
      blocks,
    });
  }

  // sell flow not triggered
  return false;
};

function findBlockIdIncludes(blocks, includes) {
  return blocks.find((block) => {
    return block && block.block_id && block.block_id.includes(includes);
  });
};

async function respondMessagesTab(event, auth) {
  const { channel } = event;
  const { userId } = auth;

  const userRef = await db.collection('users').doc(userId).get();
  const userToken = userRef.exists && userRef.data().token;

  if (!userToken) {
    // ask for permission to get user token
    return await postMessageRequestPermission(auth);
  }

  const botClient = await botClientFactory(auth);
  // query latest messages
  const { messages } = await botClient.conversations.history({ channel, limit: 5 });

  const blocks = messages.flatMap((message) => message.blocks);

  // we don't have user token and also we haven't asked for it recently
  if (!userToken && !findBlockIdIncludes(blocks, 'ask_permission')) {
    // ask for user token
    return await postMessageRequestPermission(auth);
  }

  // if we have user token and haven't posted sell instruction recently
  if (userToken && !findBlockIdIncludes(blocks, 'sell_instruction')) {
    // post sell instruction
    return await postMessageSellInstruction(auth);
  }

  return false;
};

slackEvents.on('app_home_opened', async (event, body, headers) => {
  logger.log('-- app_home_opened ---', event);
  logger.log('body', body);
  logger.log('headers', headers);
  /* example event
    {
      "type":"app_home_opened",
      "user":"U01KMTKK9FA",
      "channel":"D01JY31KPNE",
      "event_ts":"1612638222.652394",
      "tab":"home"
    }
  */
  const auth = getAuthFromEventBody(body);

  const { tab } = event;
  if (tab === 'home') {
    return await renderHomeTab(auth);
  } else if (tab === 'messages') {
    return await respondMessagesTab(auth);
  }
});

slackEvents.on('message', (event, body) => {
  logger.log('-- message ---', event);
  /* example event
  {
    "files": [{...}],
    "channel_type":"im",
    "type":"message",
    "user":"U01KMTKK9FA","display_as_bot":false,
    "blocks":[{
      "block_id":"DNI",
      "type":"rich_text",
      "elements":[{
        "type":"rich_text_section",
        "elements":[{
          "text":"message with pic",
          "type":"text"
        }]}
      ]
    }],
    "event_ts":"1612722174.005700",
    "text":"message with pic",
    "ts":"1612722174.005700",
    "channel":"D01JY31KPNE",
    "upload":false,
    "subtype":"file_share"
  }
  */
  const auth = getAuthFromEventBody(body);
  triggerSellFlow(event, body);
});

const slackEventsApp = express();
slackEventsApp.use('/', slackEvents.expressMiddleware());

module.exports = slackEventsApp;

