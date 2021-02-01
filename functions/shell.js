const admin = require("firebase-admin");

const serviceAccount = require("./service-account-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// run using:
// node -i -e "$(< shell.js)"
