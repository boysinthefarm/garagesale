const { db } = require('./utils');
const { UnauthorizedError } = require('./exceptions');
 

class PostsApi {
  /*
   * wrapper around db.collection('posts')
   * When interacting with firestore, use this class
   * to handle data access
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
    this.currentDocRef = null;

    // by default, every query will filter by team
    this.currentQuery = this.collection
      .where('team', '==', this.teamId);
    return this;
  }

  where(...params) {
    this.currentQuery = currentQuery.where(...params);
    return this;
  }

  get() {
    return this.currentQuery.get();
  }

  doc(postId) {
    this.currentDocRef = this.collection.doc(postId);
    return this;
  }

  async update(param) {
    const doc = await this.currentDocRef.get();
    const { seller, team } = doc.data();

    // can only be modified by the seller himself
    if (seller !== this.userId || team !== this.teamId) {
      throw new UnauthorizedError('Not authorized to modify post');
    }

    return this.currentDocRef.update(param);
  }
}

module.exports = {
  PostsApi,
};

