/**
 * Library for storing and rotating logs
 */

// Dependencies
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Container for the module
const logs = {}

// Base dir of the logs folder
logs.baseDir = path.join(__dirname, '/../.logs/')

logs._getFileName = (file) => `${logs.baseDir}${file}.log`

// Append a string to a file. Create a file if it does not exist
logs.appendP = (file, str) => new Promise((resolve, reject) => {
    // Construct a file name
    const fileName = logs._getFileName(file)
    // Open the file for appending
    fs.open(fileName, 'a', (openError, fileDescriptor) => {
      if (!openError && fileDescriptor) {
        fs.appendFile(fileDescriptor, `${str}\n`, (appendError) => {
          if (!appendError) {
            resolve()
          } else {
            reject(new Error(`Error appending to file: ${appendError.message}`))
          }
        })
      } else {
        reject(new Error(`Could not open the file ${fileName}: ${openError.message}`))
      }
    })
  })

// Trim .log from the filename
logs._trimFileName = (fileName) => fileName.replace('.log', '')

// Filter uncompressed log files
logs._filterUncompressed = (fileName) => fileName.indexOf('.log') > -1

// List all the uncompressed logs
logs.listUncompressedP = () => new Promise((resolve, reject) => {
    fs.readdir(logs.baseDir, (readError, data) => {
      if (!readError && data && Array.isArray(data) && data.length > 0) {
        const filteredAndTrimmedFiles = data.filter(logs._filterUncompressed).map(logs._trimFileName)
        resolve(filteredAndTrimmedFiles)
      } else {
        reject(new Error(`Could not readdir: ${readError.message}`))
      }
    })
  })

// Compress the contents of one .log file into a .gz.b64 file within the same dir
logs.compressP = (logId, newFileId) => new Promise((resolve, reject) => {
    const sourceFile = `${logId}.log`
    const destFile = `${newFileId}.gz.b64`

    // Read the source file
    fs.readFile(logs.baseDir + sourceFile, 'utf8', (readFileError, inputString) => {
      if (!readFileError && inputString) {
        zlib.gzip(inputString, (gzipError, buffer) => {
          if (!gzipError && buffer) {
            fs.open(logs.baseDir + destFile, 'wx', (openError, fileDescriptor) => {
              if (!openError && fileDescriptor) {
                // Write to the destination file
                fs.writeFile(fileDescriptor, buffer.toString('base64'), (writeError) => {
                  if (!writeError) {
                    fs.close(fileDescriptor, (closeError) => {
                      if (!closeError) {
                        resolve()
                      } else {
                        reject(closeError)
                      }
                    })
                  } else {
                    reject(new Error(`Could not write the file: ${writeError.message}`))
                  }
                })
              } else {
                reject(new Error(`Could not open the file for gzip content: ${openError.message}`))
              }
            })
          } else {
            reject(new Error(`Could not compress content: ${gzipError.message}`))
          }
        })
      } else {
        reject(new Error(`Could not read the log content before gzipping it: ${readFileError.message}`))
      }
    })
  })

// Decompress the contents of a .gz.b64 file into a string var
logs.decompressP = (fileId) => new Promise((resolve, reject) => {
    const fileName = `${fileId}.gz.b64`
    fs.readFile(logs.baseDir + fileName, 'utf8', (readError, str) => {
      if (!readError && str) {
        const inputBuffer = Buffer.from(str, 'base64')
        zlib.unzip(inputBuffer, (unzipError, outputBuffer) => {
          if (!unzipError && outputBuffer) {
            const outputStr = outputBuffer.toString()
            resolve(outputStr)
          } else {
            reject(unzipError)
          }
        })
      } else {
        reject(readError)
      }
    })
  })

// Truncate a log file
logs.truncateP = (logId) => new Promise((resolve, reject) => {
    const logFile = `${logs.baseDir}${logId}.log`
    fs.truncate(logFile, 0, (truncateError) => {
      if (!truncateError) {
        resolve()
      } else {
        reject(truncateError)
      }
    })
  })

module.exports = logs
