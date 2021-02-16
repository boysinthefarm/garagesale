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
async function triggerSellFlow(event) {
  const { files, user } = event;

  // no files
  if (!files) { return false; }

  const images = getImageFiles(files);
  // no images
  if (!images.length) { return false; }

  let userRef = await db.collection('users').doc(user).get();
  if (!userRef.exists) {
    // trigger user oauth flow
    return postMessageRequestPermission(event);
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

async function respondMessagesTab(event) {
  const { channel, user } = event;

  const userRef = await db.collection('users').doc(user).get();
  const userToken = userRef.exists && userRef.data().token;

  if (!userToken) {
    // ask for permission to get user token
    return await postMessageRequestPermission(event);
  }

  const botClient = await botClientFactory({ userId: user });
  // query latest messages
  const { messages } = await botClient.conversations.history({ channel, limit: 5 });

  const blocks = messages.flatMap((message) => message.blocks);

  // we don't have user token and also we haven't asked for it recently
  if (!userToken && !findBlockIdIncludes(blocks, 'ask_permission')) {
    // ask for user token
    return await postMessageRequestPermission(event);
  }

  // if we have user token and haven't posted sell instruction recently
  if (userToken && !findBlockIdIncludes(blocks, 'sell_instruction')) {
    // post sell instruction
    return await postMessageSellInstruction(event);
  }

  return false;
};

slackEvents.on('app_home_opened', async (event, body, headers) => {
  logger.log('-- app_home_opened ---', event);
  logger.log('body', body);
  logger.log('header', header);
  /* example event
    {
      "type":"app_home_opened",
      "user":"U01KMTKK9FA",
      "channel":"D01JY31KPNE",
      "event_ts":"1612638222.652394",
      "tab":"home"
    }
  */
  const { tab } = event;
  if (tab === 'home') {
    return await renderHomeTab(event);
  } else if (tab === 'messages') {
    return await respondMessagesTab(event);
  }
});

slackEvents.on('message', (event) => {
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
  triggerSellFlow(event);
});

slackEvents.on('app_mention', async (event) => {
  logger.log('-- app_mention ---', event);
  /* sample event:
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
      files: [
        created: 1611449569
        display_as_bot: false
        editable: false
        external_type: ""
        filetype: "jpg"
        has_rich_preview: false
        id: "F01K83HS1ST"
        is_external: false
        is_public: true
        is_starred: false
        mimetype: "image/jpeg"
        mode: "hosted"
        name: "will-smith-9542165-1-402.jpg"
        original_h: 300
        original_w: 300
        permalink: "https://slackgaragesale.slack.com/files/U01KMTKK9FA/F01K83HS1ST/will-smith-9542165-1-402.jpg"
        permalink_public: "https://slack-files.com/T01JY8V5675-F01K83HS1ST-8170754632"
        pretty_type: "JPEG"
        public_url_shared: false
        size: 17172
        thumb_64: "https://files.slack.com/files-tmb/T01JY8V5675-F01K83HS1ST-87fd5a23ea/will-smith-9542165-1-402_64.jpg"
        thumb_80: "https://files.slack.com/files-tmb/T01JY8V5675-F01K83HS1ST-87fd5a23ea/will-smith-9542165-1-402_80.jpg"
        thumb_160: "https://files.slack.com/files-tmb/T01JY8V5675-F01K83HS1ST-87fd5a23ea/will-smith-9542165-1-402_160.jpg"
        thumb_360: "https://files.slack.com/files-tmb/T01JY8V5675-F01K83HS1ST-87fd5a23ea/will-smith-9542165-1-402_360.jpg"
        thumb_360_h: 300
        thumb_360_w: 300
        thumb_tiny: "AwAwADCoYxUZCg1LLwvHepbeBcAtyfelew0rlXA/u00gdRWqyDHSqU8W18gcGkmNxKtPRT1p2zinxjFWSPkGUP51JFIFXkHHrUatv4Ap8YVck9RWbLiTO7MoxnB9KjKkodwwPrSrKNuADketBctxngetIobMAYVPH4VCoolZvlGSR2FMLOvUYq1sZy3JYBgZBokODupYYmZeOKm8gKuXOTRYd7IbC20fKufellJJA6sajkUooZSRk4q3aW5T95J989Ae1FtQ5rq4qwCO3ZpOuM/Sq0mJIs4qa+myfKU9OWqoG6jtVqOhNz//2Q=="
        timestamp: 1611449569
        title: "will-smith-9542165-1-402.jpg"
        url_private: "https://files.slack.com/files-pri/T01JY8V5675-F01K83HS1ST/will-smith-9542165-1-402.jpg"
        url_private_download: "https://files.slack.com/files-pri/T01JY8V5675-F01K83HS1ST/download/will-smith-9542165-1-402.jpg"
        user: "U01KMTKK9FA"
        username: ""
      ]
    }
  */
  triggerSellFlow(event);
});

const slackEventsApp = express();
slackEventsApp.use('/', slackEvents.expressMiddleware());

module.exports = slackEventsApp;

