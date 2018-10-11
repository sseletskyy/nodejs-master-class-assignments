/**
 * Request handlers
 */

const helpers = require('./helpers')
const validators = require('./validators')
const _data = require('./data')
const config = require('./config')
const Either = require('./monads/either')

const handlers = {}

// default handler
handlers.notFound = (data, cb) => {
  console.log('Default handler - notFound') // eslint-disable-line no-console
  cb(404, { message: `Path ${data.trimmedPath} is not defined` })
}
// Sample handler
handlers.ping = (data, cb) => {
  // Callback a status code, and a payload object
  cb(200)
}

handlers.hello = (data, cb) => {
  const queryObj = typeof data.queryStringObj === 'object' ? data.queryStringObj : {}
  const possibleStringAry = Object.values(queryObj)
  if (data.payload) {
    possibleStringAry.push(data.payload)
  }
  cb(200, { message: `Hello ${possibleStringAry.join(' ')}` })
}

// Container for the users submethods
handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone , password, tosAgreement
// Optional data: none

handlers._users.post = (data, callback) => {
  const { payload } = data

  const validatedPayload = [
    validators.notEmptyString('firstName', payload.firstName),
    validators.notEmptyString('lastName', payload.lastName),
    validators.isPhoneNumberWithLength(10)('phone', payload.phone),
    validators.notEmptyString('password', payload.password),
    validators.isBooleanAndTrue('tosAgreement', payload.tosAgreement),
  ]
  const errorMessages = validators.getValidationMessages(validatedPayload)

  if (errorMessages.length === 0) {
    // Make sure that the user does not already exist
    const validatedValues = validators.getValuesAsObject(validatedPayload)
    const readCallback = (err, _) => {
      if (err) {
        const hashedPassword = helpers.hash(validatedValues.password)
        if (!hashedPassword) {
          callback(500, { Error: "Could not hash the user's password" })
        } else {
          const userObject = Object.assign({}, validatedValues, {
            password: hashedPassword,
          })
          // Store the user
          const createCallback = (error) => {
            if (!error) {
              callback(200)
            } else {
              callback(500, {
                Error: `Could not create the new user: ${JSON.stringify(userObject)}`,
              })
            }
          }
          _data.create('users', validatedValues.phone, userObject, createCallback)
        }
      } else {
        // User already exists
        callback(400, {
          Error: `A user with the phone number already exists: ${validatedValues.phone}`,
        })
      }
    }
    _data.read('users', validatedValues.phone, readCallback)
  } else {
    callback(400, { Error: errorMessages })
  }
}

// Users - get
// Required data: phone
// Optional data: none

handlers._users.get = (data, callback) => {
  const eitherPhone = validators.isPhoneNumberWithLength(10)('phone', data.queryStringObj.phone)
  if (eitherPhone.isRight()) {
    // Get the token from the Headers
    const eitherToken = validators.isStringWithLength(20)('token', data.headers.token)
    if (eitherToken.isRight()) {
      // Verify that the given token is valid for the phone number
      const verifyCallback = (tokenIsValid) => {
        if (tokenIsValid) {
          const readCallback = (err, userData) => {
            if (!err && userData) {
              // remove hashedPassword from user object before return to requester
              delete userData.password // eslint-disable-line no-param-reassign
              callback(200, userData)
            } else {
              callback(404)
            }
          }
          _data.read('users', eitherPhone.right().phone, readCallback)
        } else {
          callback(400, {
            Error: 'User is not authorized according to token in headers',
          })
        }
      }
      handlers._tokens.verifyToken(eitherToken.right().token, eitherPhone.right().phone, verifyCallback)
    } else {
      callback(400, { Error: 'Token is missing in headers' })
    }
  } else {
    callback(400, { Error: `Missing required field: ${eitherPhone.left()}` })
  }
}

// Users - put
// Required: phone
// Optional: others

handlers._users.put = (data, callback) => {
  const { payload } = data
  const validatedPayload = [
    validators.isPhoneNumberWithLength(10)('phone', payload.phone),
    validators.notEmptyString('firstName', payload.firstName),
    validators.notEmptyString('lastName', payload.lastName),
    validators.notEmptyString('password', payload.password),
  ]

  const validatedValues = validators.getValuesAsObject(validatedPayload)

  if (validatedValues.phone) {
    // if at least one param is set besides phone
    if (Object.keys(validatedValues).length > 1) {
      // Get token from headers
      const eitherToken = validators.isStringWithLength(20)('token', data.headers.token)
      if (eitherToken.isRight()) {
        // Verify that the given token is valid for the phone number
        const verifyCallback = (tokenIsValid) => {
          if (tokenIsValid) {
            // Lookup the user
            const readCallback = (err, userData) => {
              if (!err && userData) {
                // Update the fields necessary
                const updatedData = Object.assign({}, userData, validatedValues)
                if (validatedValues.password) {
                  const hashedPassword = helpers.hash(validatedValues.password)
                  if (hashedPassword) {
                    updatedData.password = hashedPassword
                  } else {
                    callback(500, {
                      Error: "Could not hash the user's password",
                    })
                  }
                }
                const updateCallback = (error) => {
                  if (!error) {
                    delete updatedData.password
                    callback(200, updatedData)
                  } else {
                    callback(500, {
                      Error: `Could not update data for user: ${validatedValues.phone}`,
                    })
                  }
                }
                _data.update('users', validatedValues.phone, updatedData, updateCallback)
              } else {
                callback(400, { Error: 'User data not found' })
              }
            }
            _data.read('users', validatedValues.phone, readCallback)
          } else {
            callback(400, {
              Error: 'User is not authorized according to token in headers',
            })
          }
        }
        handlers._tokens.verifyToken(eitherToken.right().token, validatedValues.phone, verifyCallback)
      } else {
        callback(400, { Error: 'Token is missing in headers' })
      }
    } else {
      callback(400, { Error: 'Missing fields to update' })
    }
  } else {
    callback(400, { Error: 'Missing required field phone' })
  }
}

// Users - delete
// Required - phone
handlers._users.delete = (data, callback) => {
  const eitherPhone = validators.isPhoneNumberWithLength(10)('phone', data.queryStringObj.phone)
  // Check phone number is valid
  if (eitherPhone.isRight()) {
    // Get token from headers
    const eitherToken = validators.isStringWithLength(20)('token', data.headers.token)
    if (eitherToken.isRight()) {
      const verifyCallback = (tokenIsValid) => {
        if (tokenIsValid) {
          const readCallback = (err, userData) => {
            if (!err && userData) {
              const deleteCallback = (error) => (error ? callback(404) : handlers._checks._deleteAllByUser(userData, callback))
              _data.delete('users', eitherPhone.right().phone, deleteCallback)
            } else {
              callback(500, { Error: 'Could not delete the specified user' })
            }
          }
          _data.read('users', eitherPhone.right().phone, readCallback)
        } else {
          callback(400, { Error: 'User is not authorized accroding to token in headers' })
        }
      }
      handlers._tokens.verifyToken(eitherToken.right().token, eitherPhone.right().phone, verifyCallback)
    } else {
      callback(400, { Error: 'Missing token in headers' })
    }
  } else {
    callback(400, { Error: `Missing required field: ${eitherPhone.left()}` })
  }
}

handlers._users.options = (_, callback) => callback(200)

handlers.users = (data, callback) => {
  const acceptableMethods = 'post get put delete'.split(' ')
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Tokens

// Container for all the tokens methods

handlers._tokens = {}

// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const { payload } = data

  const validatedPayload = [
    validators.isPhoneNumberWithLength(10)('phone', payload.phone),
    validators.notEmptyString('password', payload.password),
  ]
  const errorMessages = validators.getValidationMessages(validatedPayload)
  if (errorMessages.length) {
    callback(400, { Error: ['Missing required fields'].concat(errorMessages) })
  } else {
    // Lookup the user who matches that phone number
    const validatedValues = validators.getValuesAsObject(validatedPayload)
    const userReadCallback = (err, userData) => {
      if (!err && userData) {
        // Hash the sent password, and compare with the stored one
        const hashedPassword = helpers.hash(validatedValues.password)
        if (hashedPassword === userData.password) {
          // If valid, create a new token with a random name. Set expiration date 1hour in the future
          const tokenId = helpers.createRandomString(20)
          const expires = Date.now() + 1000 * 60 * 60
          const tokenObject = {
            phone: validatedValues.phone,
            id: tokenId,
            expires,
          }
          // Store the token
          const createTokenCallback = (error) => {
            if (error) {
              callback(500, {
                Error: `Could not create a token for specified user, phone = ${validatedValues.phone}`,
              })
            } else {
              callback(200, tokenObject)
            }
          }
          _data.create('tokens', tokenId, tokenObject, createTokenCallback)
        } else {
          callback(400, {
            Error: "Password did not match the the specified user's password",
          })
        }
      } else {
        callback(400, { Error: 'Could not find the specified user' })
      }
    }
    _data.read('users', validatedValues.phone, userReadCallback)
  }
}
// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const eitherId = validators.isStringWithLength(20)('id', data.queryStringObj.id)
  if (eitherId.isRight()) {
    // look up the token
    const readCallback = (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData)
      } else {
        callback(404)
      }
    }
    _data.read('tokens', eitherId.right().id, readCallback)
  } else {
    callback(400, { Error: `Missing required field: ${eitherId.left()}` })
  }
}
// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const { payload } = data

  const validatedPayload = [
    validators.isStringWithLength(20)('id', payload.id),
    validators.isBooleanAndTrue('extend', payload.extend),
  ]
  const errorMessages = validators.getValidationMessages(validatedPayload)

  if (errorMessages.length === 0) {
    const validatedValues = validators.getValuesAsObject(validatedPayload)
    // look up the token
    const readCallback = (err, tokenData) => {
      if (!err && tokenData) {
        // check that the token is not expired yet
        if (tokenData.expires > Date.now()) {
          // update token
          tokenData.expires = Date.now() + 1000 * 60 * 60 // eslint-disable-line no-param-reassign
          const updateCallback = (error) => {
            if (!error) {
              callback(200, tokenData)
            } else {
              callback(500, { Error: "Could not update the token' expiration" })
            }
          }
          _data.update('tokens', validatedValues.id, tokenData, updateCallback)
        } else {
          callback(404, {
            Error: 'The token has expired and cannot be extended',
          })
        }
        callback(200, tokenData)
      } else {
        callback(404)
      }
    }
    _data.read('tokens', validatedValues.id, readCallback)
  } else {
    callback(400, { Error: errorMessages })
  }
}

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  const eitherId = validators.isStringWithLength(20)('id', data.queryStringObj.id)
  // Check phone number is valid
  if (eitherId.isRight()) {
    const readCallback = (err, tokenData) => {
      if (!err && tokenData) {
        const deleteCallback = (error) => (error ? callback(404) : callback(200))
        _data.delete('tokens', eitherId.right().id, deleteCallback)
      } else {
        callback(500, { Error: 'Could not delete the specified token' })
      }
    }
    _data.read('tokens', eitherId.right().id, readCallback)
  } else {
    callback(400, { Error: `Missing required field: ${eitherId.left()}` })
  }
}

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
  // Look up the token
  const readCallback = (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true)
      } else {
        callback(false)
      }
    } else {
      callback(false)
    }
  }
  _data.read('tokens', id, readCallback)
}

handlers._tokens.verifyTokenP = (id, phone) => new Promise((resolve, reject) => {
    // Look up the token
    const readCallback = (tokenData) => {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        resolve(true)
      } else {
        resolve(false)
      }
    }

    _data.readP('tokens', id).then(readCallback, (err) => reject(err))
  })

handlers.tokens = (data, callback) => {
  const acceptableMethods = 'post get put delete'.split(' ')
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Checks
handlers._checks = {}

handlers.checks = (data, callback) => {
  const acceptableMethods = 'post get put delete'.split(' ')
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Container for all the checks methods

// GENERAL CALLBACKS
handlers._checks.checkIdFailed = (callback) => () => callback(400, { Error: 'Check ID did not exist' })
handlers._checks.verifyToken = (data, callback) => (checkData) => {
  // Verify that the given token is valid and belongs to the user
  const eitherToken = validators.isStringWithLength(20)('token', data.headers.token)
  if (eitherToken.isRight()) {
    return Promise.all([
      checkData,
      handlers._tokens.verifyTokenP(eitherToken.right().token, checkData.userPhone).catch(() => callback(403, {
          Error: 'User is not authorized according to token in headers',
        }),
      ),
    ])
  } else {
    return Promise.reject(new Error('Token is missing'))
  }
}
handlers._checks._deleteAllByUser = (userData, callback) => {
  const checks = Array.isArray(userData.checks) ? userData.checks : []
  if (checks.length === 0) {
    return callback(200)
  }
  const promises = checks.map((check) => _data.deleteP('checks', check))
  return Promise.all(promises).finally(() => callback(200))
}

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none

handlers._checks.post = (data, callback) => {
  // Validate inputs
  const { payload } = data
  const validatedPayload = [
    validators.isProtocol('protocol', payload.protocol),
    validators.notEmptyString('url', payload.url),
    validators.isMethod('method', payload.method),
    validators.isSuccessCodes('successCodes', payload.successCodes),
    validators.isTimeoutSeconds('timeoutSeconds', payload.timeoutSeconds),
  ]

  const validationMessages = validators.getValidationMessages(validatedPayload)
  const params = validators.getValuesAsObject(validatedPayload)

  const buildCheckObject = (parameters) => (userData) => {
    let { checks } = userData
    if (!Array.isArray(checks)) {
      checks = []
    }
    // Verify that the user has less than the number of max-checks-per-user
    if (checks.length < config.maxChecks) {
      // Create a random id for the check
      const checkId = helpers.createRandomString(20)

      // create the check object, and include the user's phone
      const {
 protocol, url, method, successCodes, timeoutSeconds, 
} = parameters
      const checkObj = {
        id: checkId,
        userPhone: userData.phone,
        protocol,
        url,
        method,
        successCodes,
        timeoutSeconds,
      }

      return Either.Right(checkObj)
    } else {
      return Either.Left(`The user already has the maximum number of checks (${config.maxChecks})`)
    }
  }

  if (validationMessages.length > 0) {
    return callback(400, { Error: validationMessages })
  }
  // Get the token from headers
  const eitherToken = validators.isStringWithLength(20)('token', data.headers.token)
  if (eitherToken.isLeft()) {
    return callback(400, { Error: 'Missing token in headers' })
  }
  const readUserData = (tokenData) => _data.readP('users', tokenData.phone)
  const readTokenDataFailed = () => callback(403, { Error: 'User is not authorized accroding to token in headers' })

  const createCheck = (userData) => {
    const eitherCheckObj = buildCheckObject(params)(userData)
    if (eitherCheckObj.isLeft()) {
      return callback(400, { Error: eitherCheckObj.left() })
    }
    const checkObj = eitherCheckObj.right()

    // Save the object
    return _data.createP('checks', checkObj.id, checkObj).then(() => ({ userData, checkObj }))
  }
  const readUserFailed = () => callback(403, { Error: 'Could not read user data based on phone' })

  const updateUser = ({ userData, checkObj }) => {
    let { checks } = userData
    if (!Array.isArray(checks)) {
      checks = []
    }

    checks.push(checkObj.id)
    const updatedUserData = Object.assign({}, userData, { checks })

    return _data.updateP('users', userData.phone, updatedUserData).then(() => checkObj)
  }

  const createCheckFailed = () => callback(500, {
      Error: 'Could not store new check for the user',
    })

  const updateUserFinished = (checkObj) => callback(200, checkObj)
  const updateUserFailed = () => callback(500, {
      Error: 'Could not update user with a new check',
    })

  return _data
    .readP('tokens', eitherToken.right().token)
    .then(readUserData, readTokenDataFailed)
    .then(createCheck, readUserFailed)
    .then(updateUser, createCheckFailed)
    .then(updateUserFinished, updateUserFailed)
}

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // Check that the id is valid
  const eitherId = validators.isStringWithLength(20)('id', data.queryStringObj.id)
  if (eitherId.isLeft()) {
    return callback(400, { Error: `Missing required field: ${eitherId.left()}` })
  }
  const returnCheckData = ([checkData]) => callback(200, checkData)

  return _data
    .readP('checks', eitherId.right().id)
    .then(handlers._checks.verifyToken(data, callback))
    .then(returnCheckData)
    .catch((error) => callback(404, { Error: error.message }))
}

// Checks -put
// Required data: id
// Optional data: protocol , url ,successCodes, method, timeoutSeconds
handlers._checks.put = (data, callback) => {
  // Validate inputs
  const { payload } = data

  const eitherId = validators.isStringWithLength(20)('id', payload.id)
  if (eitherId.isLeft()) {
    return callback(400, {
      Error: `Missing required field: ${eitherId.left()}`,
    })
  }

  const validatedPayload = [
    validators.isProtocol('protocol', payload.protocol),
    validators.notEmptyString('url', payload.url),
    validators.isMethod('method', payload.method),
    validators.isSuccessCodes('successCodes', payload.successCodes),
    validators.isTimeoutSeconds('timeoutSeconds', payload.timeoutSeconds),
  ]

  const params = validators.getValuesAsObject(validatedPayload)

  // check params has at least one value, otherwise return error
  if (Object.keys(params).length === 0) {
    return callback(400, { Error: 'Missing fields to update' })
  }

  const updateTheCheck = ([checkData]) => {
    const newCheckData = Object.assign({}, checkData, params)
    return _data
      .updateP('checks', eitherId.right().id, newCheckData)
      .then(() => newCheckData, () => callback(500, { Error: 'Could not update the check' }))
  }

  const returnUpdatedCheck = (newCheckData) => callback(200, newCheckData)

  return _data
    .readP('checks', eitherId.right().id)
    .then(handlers._checks.verifyToken(data, callback), handlers._checks.checkIdFailed)
    .then(updateTheCheck)
    .then(returnUpdatedCheck)
    .catch((e) => callback(404, { Error: e.message }))
}

// Checks - delete
// Required data: id
// Optional data: none

handlers._checks.delete = (data, callback) => {
  const eitherId = validators.isStringWithLength(20)('id', data.queryStringObj.id)
  if (eitherId.isLeft()) {
    return callback(400, { Error: `Missing required field: ${eitherId.left()}` })
  }

  const deleteCheckData = ([checkData]) => _data
      .deleteP('checks', checkData.id)
      .then(() => checkData, () => callback(500, { Error: 'Could not delete the check data' }))

  const readUserData = (checkData) => _data
      .readP('users', checkData.userPhone)
      .then((userData) => [checkData, userData])
      .catch(() => callback(500, { Error: 'Could not find user who chreated the check to be deleted' }))

  const updateUserData = ([checkData, userData]) => {
    const newChecks = (Array.isArray(userData.checks) ? userData.checks : []).filter(
      (checkId) => checkId !== checkData.id,
    )
    const newUserData = Object.assign({}, userData, { checks: newChecks })
    return _data
      .updateP('users', userData.phone, newUserData)
      .catch(() => callback(500, { Error: 'Could not remove the check from the user data' }))
  }

  return _data
    .readP('checks', eitherId.right().id)
    .then(handlers._checks.verifyToken(data, callback), handlers._checks.checkIdFailed)
    .then(deleteCheckData)
    .then(readUserData)
    .then(updateUserData)
    .then(() => callback(200))
}

module.exports = handlers
