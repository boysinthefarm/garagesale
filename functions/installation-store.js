const { db } = require('./db-api');

module.exports = {
  storeInstallation: async (installation) => {
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
    } else if (teamId !== undefined) {
      // single team installation
      installationId = teamId;
    } else if (userId) {
      const user = await db.collection('users')
        .doc(userId).get();
      installationId = user.data().installationId;
    }

    if (installationId) {
      // query installation
      return db.collection('installations')
        .doc(installationId).get()
        .then(doc => doc.data());
    }

    throw new Error('Failed fetching installation');
  },
};

