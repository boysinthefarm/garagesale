const express = require('express');
const functions = require('firebase-functions');
const { createEventAdapter } = require('@slack/events-api');
const { logger, webClientBot, webClientUser } = require('./utils');
const { listCommandBlock } = require('./block-kits');

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

const slackEvents = createEventAdapter(functions.config().slack.signing_secret);

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
  const { user: userId } = event;
  const {
    user: {
      team_id: teamId,
    }
  } = await webClientBot.users.info({ user: userId });

  webClientBot.views.publish({
    user_id: userId,
    view: {
      type: 'home',
      blocks: await listCommandBlock({ userId, teamId }),
    },
  });
});

slackEvents.on('message.im', (event) => {
  logger.log('-- message.im ---', event);
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
  const blocks = [];
  const makeImagePublicPromises = [];
  const { files } = event;
  if (files) {
    images = getImageFiles(files).forEach((image) => {
      if (!image.public_url_shared) {
        makeImagePublicPromises.push(
          webClientUser.files.sharedPublicURL({ file: image.id })
            .catch((error) => {
              if (error.message === 'already_public') {
                return;
              }
            })
        ); 
      }
      const imageUrl = getImagePublicLink(image);
      blocks.push({
        type: 'image',
        image_url: imageUrl,
        alt_text: 'item for sale',
      });
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Sell This Item!',
            emoji: true,
          },
          value: imageUrl,
          action_id: 'sell_this_item',
        }],
      })
    });
  }

  await Promise.all(makeImagePublicPromises);

  await webClientBot.chat.postEphemeral({
    channel: event.channel,
    user: event.user,
    blocks,
  });
});

const slackEventsApp = express();
slackEventsApp.use('/', slackEvents.expressMiddleware());

module.exports = slackEventsApp;

