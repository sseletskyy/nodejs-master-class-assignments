/**
 * Helpers for various tasks
 *
 */

const crypto = require('crypto');
const config = require('./config');
// Conitaner

const helpers = {};

// Create a SHA256 hash

helpers.hash = str => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  }
  return false;
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

// Create a string of ramdon alphanumeric chars of a given length
helpers.createRandomString = strLength => {
  const len = typeof strLength === 'number' && strLength > 0 ? strLength : false;
  if (!len) {
    return false;
  }
  // Define all possible chars that could go intoa string
  const possibleChars = '1234567890qwertyuiopasdfghjklzxcvbnm';
  const pcl = possibleChars.length;
  const generateRandomChar = () => {
    const randomIndex = Math.floor(Math.random() * pcl);
    return possibleChars[randomIndex];
  };
  return Array(len)
    .fill(1)
    .map(generateRandomChar)
    .join('');
};
module.exports = helpers;
