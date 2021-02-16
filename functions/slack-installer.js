const functions = require('firebase-functions');
const { InstallProvider } = require('@slack/oauth');
const { WebClient } = require('@slack/web-api');
const installationStore = require('./installation-store');

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
  installationStore,
});

async function botClientFactory(query) {
  functions.logger.log('botClientFactory', query);
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

module.exports = {
  installer,
  botClientFactory,
  generateInstallUrl,
};

