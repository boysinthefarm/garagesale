const functions = require('firebase-functions');
const { InstallProvider } = require('@slack/oauth');
const { WebClient } = require('@slack/web-api');
const { db } = require('./db-api');
const { getMrkdwnBlock, askPermissionBlock } = require('./block-kits');
const { logger, webClientBot } = require('./utils');

const {
  client_id: clientId,
  client_secret: clientSecret,
  state_secret: stateSecret,
} = functions.config().slack;

// initialize the installProvider
const installer = new InstallProvider({
  clientId,
  clientSecret,
  stateSecret,
  installationStore: {
    storeInstallation: async (installation) => {
      logger.log('installation', installation);
      const storePromises = [];

      let installationId = '';
      if (installation.isEnterpriseInstall) {
        // storing org installation
        installationId = installation.enterprise.id;
      } else if (installation.team !== null && installation.team.id !== undefined) {
        // storing single team installation
        installationId = installation.team.id;
      }

      if (installationId) {
        storePromises.push(
          db.collection('installations')
          .doc(installationId)
          .set(installation, {merge: true})
        );
      }

      if (installation.user && installation.user.id) {
        // store user token separately
        storePromises.push(
          db.collection('users')
          .doc(installation.user.id)
          .set({
            installationId,
            ...installation.user,
          }, {merge: true})
          .then(() => {
            // let the user know that he can start selling
            postMessageSellInstruction({ user: installation.user.id });
          })
        );
      }

      return Promise.all(storePromises);
    },
    fetchInstallation: async (installQuery) => {
      if (installQuery.isEnterpriseInstall) {
        if (installQuery.enterpriseId !== undefined) {
          // fetching org installation
          return await db.collection('installations')
            .doc(installQuery.enterpriseId).get();
        }
      }
      if (installQuery.teamId !== undefined) {
        // fetching single team installation
        return await db.collection('installations')
          .doc(installQuery.teamId).get();
      }

      if (installQuery.userId) {
        const user = await db.collection('users')
          .doc(installQuery.userId).get();
        return await db.collection('installations')
          .doc(user.data().installationId);
      }
      throw new Error('Failed fetching installation');
    },
  }
});

async function botClientFactory(query) {
  const installation = await installer.authorize(query);
  return new WebClient(installation.botToken);
};

/*
 * returns Promise
*/
function generateInstallUrl() {
  return installer.generateInstallUrl({
    // Add the scopes your app needs
    scopes: [
      'app_mentions:read',
      'chat:write',
      'commands',
      'files:write',
      'im:history',
      'users:read',
      'mpim:write',
    ],
    userScopes: ['files:read', 'files:write'],
  });
};

async function postMessageSellInstruction(event) {
  const client = await botClientFactory({ userId: event.user });
  return client.chat.postMessage({
    channel: event.user,
    blocks: [getMrkdwnBlock(
      'Send a message here with an image attachment to start selling!',
      { block_id: `sell_instruction_${Date.now()}` },
    )],
  });
};

// send a message to app "Messages" tab to ask user to give us permission
async function postMessageRequestPermission(event) {
  return webClientBot.chat.postMessage({
    channel: event.user,
    blocks: askPermissionBlock(await generateInstallUrl()),
  });
};

module.exports = {
  installer,
  botClientFactory,
  generateInstallUrl,
  postMessageSellInstruction,
  postMessageRequestPermission,
};

