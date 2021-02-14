const functions = require('firebase-functions');
const { WebClient } = require('@slack/web-api');
const { InstallProvider } = require('@slack/oauth');
const { postMessageSellInstruction } = require('./post-message');
const { db } = require('./db-api');

const {
  client_id: clientId,
  client_secret: clientSecret,
  state_secret: stateSecret,
  token,
  user_token: userToken,
} = functions.config().slack;

// slack api interface
// with bot credentials
const webClientBot = new WebClient(token);
// with user credentials
const webClientUser = new WebClient(userToken);

// initialize the installProvider
const installer = new InstallProvider({
  clientId,
  clientSecret,
  stateSecret,
  installationStore: {
    storeInstallation: async (installation) => {
      functions.logger.log('installation', installation);
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

module.exports = {
  logger: functions.logger,
  db,
  webClientBot,
  webClientUser,
  installer,
  generateInstallUrl,
};

