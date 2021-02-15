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
    functions.logger.log('reset');
    // by default, every query will filter by team
    this.currentRef = this.collection
      .where('team', '==', this.teamId);
    return this;
  }

  where(...params) {
    this.currentRef = this.currentRef.where(...params);

    // add dummy orderBy for '!=' because...firebase
    if (params[1] === '!=') {
      this.currentRef = this.currentRef.orderBy(params[0]);
    }
    return this;
  }

  getOrdered() {
    return this.currentRef.orderBy('date_posted', 'desc').get();
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

