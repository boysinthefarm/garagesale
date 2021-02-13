const express = require('express');
const functions = require('firebase-functions');
const { logger, webClientBot, webClientUser } = require('./utils');
const {
  listCommandBlock,
  sellThisItemBlock,
  divider,
  headerBlock,
  askPermissionBlock,
} = require('./block-kits');
const { getMylistBlocks } = require('./mylist-handler');

const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(functions.config().slack.signing_secret);

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
const makeImagePublic = (image) => {
  if (!image.public_url_shared) {
    return webClientUser.files.sharedPublicURL({ file: image.id })
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
  const { files } = event;
  if (files) {
    // filter files for images
    // wait to make sure all of the urls have become public
    const imageUrls = await Promise.all(getImageFiles(files).map(makeImagePublic));
    logger.log('imageUrls:', imageUrls);

    // make blocks out of image urls
    const blocks = imageUrls.flatMap(sellThisItemBlock);

    return webClientBot.chat.postEphemeral({
      channel: event.channel,
      user: event.user,
      blocks,
    });
  }

  // sell flow not triggered
  return false;
};

async function renderHomeTab(event) {
  const { user: userId } = event;
  const {
    user: {
      team_id: teamId,
    }
  } = await webClientBot.users.info({ user: userId });

  const blocks = [
    headerBlock('Welcome :partying_face: \n Check out what your fellow coworkers are selling right now! :kite:'),
    divider,
    ...await listCommandBlock({ userId, teamId }),
    headerBlock('Your Garage :abacus:'),
    ...await getMylistBlocks({ userId }),
  ];

  return webClientBot.views.publish({
    user_id: userId,
    view: {
      type: 'home',
      blocks,
    },
  });
};

async function respondMessagesTab(event) {
  const blockIdPrefix = 'send_message_to_sell';
  const { channel, user } = event;
  const lastMessage = await webClientBot.conversations.history({
    channel,
    limit: 1,
  });

  const { event_ts, messages: { blocks } } = lastMessage;
  // if it hasn't been sent already, send message about triggering sell flow
  if (!blocks || !blocks.find(block => block.block_id.includes(blockIdPrefix))) {
    logger.log('permissions block:', askPermissionBlock({ blockId: `${blockIdPrefix}_${event_ts}` })); 
    return webClientBot.chat.postMessage({
      channel: user,
      blocks: askPermissionBlock({ blockId: `${blockIdPrefix}_${event_ts}` }),
    });
  }

  return false;
};

slackEvents.on('app_home_opened', (event) => {
  logger.log('-- app_home_opened ---', event);
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
    renderHomeTab(event);
  } else if (tab === 'messages') {
    respondMessagesTab(event);
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

