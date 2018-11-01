/**
 * Worker-related tasks
 */

/* eslint-disable no-console */

// Dependencies
// const path = require('path')
// const fs = require('fs')
const https = require('https')
const http = require('http')
const url = require('url')
const util = require('util')
const _data = require('./data')
const helpers = require('./helpers')
const validators = require('./validators')
const _logs = require('./logs')

const debug = util.debuglog('workers')

const workers = {}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (checkData) => {
  const msg = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${
    checkData.url
  } is currently ${checkData.state}`
  helpers.sendTwilioSms(checkData.phone, msg, (error) => {
    if (!error) {
      debug('Success: User was alerted to a status change in ther check')
    } else {
      debug('Error: Could not send sms alert to user who had a state change to their check')
    }
  })
}

// Process the checkOutcome and update the check data if needed, trigger an alert if needed
// Special logic for accomodation a check that has never been tested before
workers.processCheckOutcome = (checkData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down'

  // Decide if an alert is warranted
  const alertWarranted = checkData.lastChecked && checkData.state !== state

  // Update the check data
  const newCheckData = Object.assign({}, checkData)
  newCheckData.state = state
  newCheckData.lastChecked = Date.now()

  // Log the outcome
  const timeOfCheck = Date.now()
  workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck)

  // Save the updates
  _data
    .updateP('checks', newCheckData.id, newCheckData)
    .then(() => {
      // Send the checkData to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData)
      } else {
        debug('Check outcome has not changed, no alert needed')
      }
    })
    .catch((e) => debug(`Error trying to update checkdata: ${e.message}`))
}

// Perform the check, send the originalCHeckData and the outcome of the check process
workers.performCheck = (checkData) => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  }

  // Mark that the outcome has not meeb sent yet
  let outcomeSent = false

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true)
  const { path, hostname } = parsedUrl

  // Construct the request
  const requestDetails = {
    hostname,
    method: checkData.method.toUpperCase(),
    path,
    timeout: checkData.timeoutSeconds * 1000, // im millisec
  }

  // Instantiate the request object (using either the http or https module)
  const _moduleToUse = checkData.protocol === 'http' ? http : https

  const req = _moduleToUse.request(requestDetails, (res) => {
    const status = res.statusCode

    // update the checkOutcome
    checkOutcome.responseCode = status
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the error event so it does not get thrown
  req.on('error', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e,
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome)
      outcomeSent = true
    }
  })

  req.on('timeout', (e) => {
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome)
      outcomeSent = true
    }
  })

  // End the request
  req.end()
}

// Sanity-check the check-data
workers.validateCheckData = (checkData) => {
  // debug('validateCheckData', checkData)
  const cd = typeof checkData === 'object' && checkData !== null ? checkData : {}
  const validatedPayload = [
    validators.isStringWithLength(20)('id', cd.id),
    validators.isPhoneNumberWithLength(10)('phone', cd.phone),
    validators.isProtocol('protocol', cd.protocol),
    validators.notEmptyString('url', cd.url),
    validators.isMethod('method', cd.method),
    validators.isSuccessCodes('successCodes', cd.successCodes),
    validators.isTimeoutSeconds('timeoutSeconds', cd.timeoutSeconds),
    validators.isCheckDataState('state', cd.state || 'down'),
    validators.isNumberGreaterThan(-1)('lastChecked', cd.lastChecked || 0),
  ]
  const errorMessages = validators.getValidationMessages(validatedPayload)
  if (errorMessages.length > 0) {
    return debug(`CheckData is not valid: ${errorMessages.join(';')}`)
  }
  const params = validators.getValuesAsObject(validatedPayload)
  return workers.performCheck(params)
}

workers._readCheckP = (checkFile) => _data
    .readP('checks', checkFile)
    .then(workers.validateCheckData, (e) => debug(`Error: could not find the check to process - ${e.message}`))

workers._readChecks = (checkFileList) => {
  checkFileList.map(workers._readCheckP)
}

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.listP('checks').then(workers._readChecks, () => debug("Error reading one of the check's data"))
}

// Timer to execute the worper-process once per minute
workers.loop = () => {
  setInterval(() => workers.gatherAllChecks(), 1000 * 60)
}

// Rotate (compress) the log files
workers.rotateLogs = () => {
  // List all the non-compressed log files
  _logs
    .listUncompressedP()
    .then((list) => {
      list.forEach((logName) => {
        const logId = logName
        const newFileId = `${logId}-${Date.now()}`
        _logs
          .compressP(logId, newFileId)
          .then(() => {
            // Truncate the log
            _logs
              .truncateP(logId)
              .then(() => debug(`Success truncating the file ${logId}`))
              .catch((truncateError) => debug(`Error truncating the file ${logId}; ${truncateError.message}`))
          })
          .catch((compressError) => debug(`Could not compress the file ${logId}; ${compressError.message}`))
      })
    })
    .catch((error) => {
      debug(`Error: could not find any logs to rotate: ${error.message}`)
    })
}

// Timer to execute the log-rotation process once per day
workers.logRotateLoop = () => {
  setInterval(() => {
    workers.rotateLogs()
  }, 1000 * 60 * 60 * 24)
}
// Init script
workers.init = () => {
  // Send to console, in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running')

  // Execulte all the checks immediately
  workers.gatherAllChecks()

  // Call the loop so the checks will execute later on
  workers.loop()

  // Comporess all the logs immediately
  workers.rotateLogs()

  // Call the compression loop so logs will be compressed later on
}

// Log
workers.log = (checkData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    check: checkData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  }

  // Convert data to a string
  const logString = JSON.stringify(logData)

  // Determin the name of the log file
  const logFileName = checkData.id
  // Append the log string to the file
  _logs
    .appendP(logFileName, logString)
    .then(() => debug(`Logging for id = ${logFileName} succeded`))
    .catch((error) => debug(`Logging for id = ${logFileName} failed: ${error.message}`))
}

module.exports = workers

/* eslint-enable no-console */
