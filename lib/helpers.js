/**
 * Helpers for various tasks
 *
 */
const https = require('https')
const querystring = require('querystring')
const crypto = require('crypto')
const config = require('./config')
const validators = require('./validators')
// Conitaner

const helpers = {}

// Create a SHA256 hash

helpers.hash = (str) => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex')
    return hash
  }
  return false
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return {}
  }
}

// Create a string of ramdon alphanumeric chars of a given length
helpers.createRandomString = (strLength) => {
  const len = typeof strLength === 'number' && strLength > 0 ? strLength : false
  if (!len) {
    return false
  }
  // Define all possible chars that could go intoa string
  const possibleChars = '1234567890qwertyuiopasdfghjklzxcvbnm'
  const pcl = possibleChars.length
  const generateRandomChar = () => {
    const randomIndex = Math.floor(Math.random() * pcl)
    return possibleChars[randomIndex]
  }
  return Array(len)
    .fill(1)
    .map(generateRandomChar)
    .join('')
}

// Send an SMS msg via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate params
  const validatedPayload = [
    validators.isPhoneNumberWithLength(10)('phone', phone),
    validators.isStringWithLengthLessThan(1601)('msg', msg),
  ]
  const errorMessages = validators.getValidationMessages(validatedPayload)
  if (errorMessages.length > 0) {
    return callback(`Given parameters were missing: ${errorMessages.join(';')}`)
  }

  const params = validators.getValuesAsObject(validatedPayload)

  // Configure request payload
  const payload = {
    From: config.twilio.fromPhone,
    To: `+38${params.phone}`,
    Body: params.msg,
  }

  const stringPayload = querystring.stringify(payload)

  const requestDetails = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
    auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringPayload),
    },
  }

  // Instantiate the request object
  const req = https.request(requestDetails, (res) => {
    const status = res.statusCode
    if (status === 200 || status === 201) {
      callback(false)
    } else {
      callback(`Status code returned: ${status}`)
    }
  })

  // Bind to the error event so it does not get thrown

  req.on('error', (err) => callback(err))

  req.write(stringPayload)

  req.end()
}

module.exports = helpers
