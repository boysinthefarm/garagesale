// files: files object within slackBot request.body
const getImageFiles = (files) => {
  return files.reduce((accum, current) => {
    if (current.mimetype.includes('image')) {
      accum.push(current);
    }
    return accum;
  }, []);
};

module.exports = ({ functions, webClient, webClientUser }) => {
  return async (req, res) => {
    functions.logger.log('--- request body ---', req.body);
    /* sample req.body:
      body: {
        token: 'xxxxxxxxxxxxxxx',
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
        },
        type: 'event_callback',
          event_id: 'Ev01K4A99TMJ',
          event_time: 1610844161,
          authorizations: [ [Object]  ],
          is_ext_shared_channel: false,
          event_context: '1-app_mention-T01JY8V5675-C01KMTL9UUQ'
      }
    */
    const blocks = [];
    const makeImagePublicPromises = [];
    const { files } = req.body.event;
    if (files) {
      images = getImageFiles(files).forEach((img) => {
        if (!image.public_url_shared) {
          makeImagePublicPromises.push(webClientUser.files.sharedPublicURL({ file: image.id }));
        }
        blocks.push({
          type: 'image',
          image_url: img.permalink_public,
          alt_text: 'item for sale',
        });
      });
    }

    await Promise.all(makeImagePublicPromises);

    await webClient.chat.postMessage({
      channel: req.body.event.channel,
      text: `A message from Garage Sale!! ${Date.now()}`,
      blocks,
    });

    res.sendStatus(200);
  };
};

