const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { UnauthorizedError } = require('./exceptions');
 
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

class PostsApi {
  /*
   * wrapper around db.collection('posts')
   * When interacting with firestore, use this class
   * to handle data access
   * interface designed to match firestore db api
  */
  constructor({
    userId,
    teamId,
  }) {
    Object.assign(this, {
      userId,
      teamId,
    });

    this.reset();
  }

  get collection() {
    return db.collection('posts');
  }

  reset() {
    // by default, every query will filter by team
    // sorted by date
    this.currentRef = this.collection
      .where('team', '==', this.teamId)
      .orderBy('date_posted', 'desc');
    return this;
  }

  where(...params) {
    this.currentRef = this.currentRef.where(...params);
    return this;
  }

  get() {
    return this.currentRef.get();
  }

  doc(postId) {
    // .doc is not for query
    this.currentRef = this.collection.doc(postId);
    return this;
  }

  async update(param) {
    const doc = await this.currentRef.get();
    const { seller, team } = doc.data();

    // can only be modified by the seller himself
    if (seller !== this.userId || team !== this.teamId) {
      throw new UnauthorizedError('Not authorized to modify post');
    }

    // currentRef is spent after calling .get()
    return this.collection.doc(doc.id).update(param);
  }
}

module.exports = {
  PostsApi,
  db,
  admin,
};

