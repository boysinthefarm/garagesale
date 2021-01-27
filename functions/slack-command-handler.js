const fetch = require('node-fetch');
const triggerSellModal = require('./trigger-sell-modal');
const mylistHandler = require('./mylist-handler');

module.exports = ({ db, functions, webClient }) => {
  return async function(req, res) {
    functions.logger.log('--- request body ---', req.body);
    /* sample req.body:
      {
        pi_app_id: "A01JV09J6MT"
        channel_id: "C01KMTL9UUQ"
        channel_name: "dev"
        command: "/garage"
        is_enterprise_install: "false"
        response_url: "https://hooks.slack.com/commands/T01JY8V5675/1656868781185/qHkegJ7zRdbcBQyTGVhTLcu3"
        team_domain: "slackgaragesale"
        team_id: "T01JY8V5675"
        text: ""
        token: "xxxxxxxxxxxxxxx"
        trigger_id: "1644238199586.1644301176243.8060fa31ecbd0acd4f700636732fb728"
        user_id: "U01KMTKK9FA"
        user_name: "hyunwoo126"
      }
     */

    const { trigger_id } = req.body;

    if (req.body.text === 'list') {
      const postsRef = db.collection('posts');
      const posts = await postsRef.get(); 

      let blocks = [];
      let divider = {"type" : "divider"}

      functions.logger.log('posts', posts);

      const userInfoPromises = [];

      posts.forEach(doc => {
        userInfoPromises.push(new Promise(async (resolve) => {
          functions.logger.log('doc.id:', doc.id);
          const { title, price, seller, description, date_posted, status, image } = doc.data();

          const userInfo = await webClient.users.info({ user: seller });

          // create a json block for each posting
          let current_post =
          {
            "type" : "section",
            "text" : {
              "type": "mrkdwn",
              "text" : `${userInfo.user.profile.display_name} listed *${title}* for $${price} on ${date_posted.toDate()} \n :star: ${description}`
            },
            "accessory" : {
              "type" : "image",
              "image_url": image,
              "alt_text": title,
            }
          }

          let buy_button = 
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Buy & Message Seller",
                  "emoji": true
                },
                "style": "primary",
                "value": "button_clicked",
                // must be unique - need a way to address this
                "action_id": "actionId-0"
              }
            ]
          }
          // add each posting's block to the blocks array
          blocks.push(current_post);
          blocks.push(buy_button);
          blocks.push(divider);
          resolve();
        }));
      });

      await Promise.all(userInfoPromises);

      res.send({
        "response_type": "in_channel",
        blocks,
      });

    } else if (req.body.text === 'sell') {
      const resOpenModal = await triggerSellModal();
      const json = await resOpenModal.json();
      res.sendStatus(200);
    } else if (req.body.text === 'mylist') {
      mylistHandler(req, res);
    } else {
      res.send({
        response_type: 'in_channel',
        text: 'command successful',
      });
    }
  };
};

