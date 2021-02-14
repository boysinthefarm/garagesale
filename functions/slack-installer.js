const functions = require('firebase-functions');
const { InstallProvider } = require('@slack/oauth');
const { logger, db } = require('./db-api');
const { getMrkdwnBlock, askPermissionBlock } = require('./block-kits');
const { webClientBot } = require('./utils');

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
      if (installation.isEnterpriseInstall) {
        // storing org installation
        storePromises.push(
          db.collection('installations')
          .doc(installation.enterprise.id)
          .set(installation, {merge: true})
        );
      } else if (installation.team !== null && installation.team.id !== undefined) {
        // storing single team installation
        storePromises.push(
          db.collection('installations')
          .doc(installation.team.id)
          .set(installation, {merge: true})
        );
      }

      if (installation.user && installation.user.id) {
        // store user token separately
        storePromises.push(
          db.collection('users')
          .doc(installation.user.id)
          .set(installation.user, {merge: true})
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
      throw new Error('Failed fetching installation');
    },
  }
});

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

function postMessageSellInstruction(event) {
  return webClientBot.chat.postMessage({
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
  generateInstallUrl,
  postMessageSellInstruction,
  postMessageRequestPermission,
};

