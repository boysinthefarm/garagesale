const fetch = require('node-fetch');
const triggerSellModal = require('./trigger-sell-modal');
const { mylistHandler } = require('./mylist-handler');
const { getPostBlock, buyButton } = require('./block-kits');
const { logger, db, webClientBot } = require('./utils');

module.exports = () => {
  return async function(req, res) {
    logger.log('--- request body ---', req.body);
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
      logger.log('posts', posts);

      const userInfoPromises = [];

      posts.forEach(doc => {
        userInfoPromises.push(new Promise(async (resolve) => {
          logger.log('doc.id:', doc.id);
          const { title, price, seller, description, date_posted, status, image } = doc.data();

          const userInfo = await webClientBot.users.info({ user: seller });
          if (status === false) {
            blocks = blocks.concat(getPostBlock({
              display_name: userInfo.user.profile.display_name,
              title,
              description,
              price,
              date_posted,
              image,
            }, [buyButton]));
          };

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

