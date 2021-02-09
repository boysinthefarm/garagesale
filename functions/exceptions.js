/*
 * Garage Sale Errors
 */

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.status = 401;
  }
}

module.exports = {
  UnauthorizedError,
};

