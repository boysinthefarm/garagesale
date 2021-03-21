const { db } = require('./db-api');
const TOPIC = require('./pub-sub/topic');
const { publishJSON } = require('./pub-sub/client');

module.exports = {
  storeInstallation: async (installation) => {
    const storePromises = [];
    const teamId = installation.team && installation.team.id;
    const userId = installation.user && installation.user.id;

    let installationId = '';
    if (installation.isEnterpriseInstall) {
      // storing org installation
      installationId = installation.enterprise.id;
    } else if (teamId) {
      // storing single team installation
      installationId = teamId;
    }

    if (installationId) {
      storePromises.push(
        db.collection('installations')
        .doc(installationId)
        .set(installation, {merge: true})
      );
    }

    if (userId) {
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
          publishJSON(TOPIC.MESSAGE_SELL_INSTRUCTION, { teamId, userId });
        })
      );
    }

    return Promise.all(storePromises);
  },
  fetchInstallation: async ({
    isEnterpriseInstall,
    enterpriseId,
    teamId,
    userId,
  }) => {
    let installationId = '';

    if (isEnterpriseInstall && enterpriseId) {
      // org installation
      installationId = enterpriseId;
    } else if (teamId) {
      // single team installation
      installationId = teamId;
    } else if (userId) {
      const user = await db.collection('users').doc(userId).get();
      if (user.exists) {
        installationId = user.data().installationId;
      }
    }

    if (installationId) {
      // query installation
      return db.collection('installations')
        .doc(installationId).get()
        .then(doc => doc.data());
    }

    throw new Error('Failed retrieving installation');
  },
};

