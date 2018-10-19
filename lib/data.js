/**
 * Library for storing and editing data

 * TESTING

const _data = require('./lib/data')

const readcb = (err, data) => {
  console.log('Error:', err)
  console.log('Data:', data)
}
const cb = (err) => {
  console.log('Error:', err)
}
_data.create('test', 'newFile', { foo: 'bar' }, cb)
_data.read('test', 'newFile', readcb)
_data.update('test', 'newFile', { fizz: 'buzz' }, cb)
_data.delete('test', 'newFile', cb)
 */

const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')

// Container for the module

const lib = {}

const closeCallback = (filePath, callback) => (err) => {
  if (!err) {
    callback(false) // successful ending
  } else {
    callback(`Error closing the file: ${filePath}`)
  }
}
const closeCallbackP = (filePath, resolve, reject) => (err) => {
  if (!err) {
    resolve() // successful ending
  } else {
    reject(err)
  }
}

const writeCallback = (fileDescriptor, filePath, callback) => (err) => {
  if (!err) {
    fs.close(fileDescriptor, closeCallback(filePath, callback))
  } else {
    callback(`Error writing to file: ${filePath}`)
  }
}
const writeCallbackP = (fileDescriptor, filePath, resolve, reject) => (err) => {
  if (!err) {
    fs.close(fileDescriptor, closeCallbackP(filePath, resolve, reject))
  } else {
    reject(err)
  }
}

const truncateAndWriteCallback = (stringData) => (fileDescriptor, filePath, callback) => (err) => {
  if (!err) {
    // Write to the file and close it
    fs.writeFile(fileDescriptor, stringData, writeCallback(fileDescriptor, filePath, callback))
  } else {
    callback(`Could not truncate the file: ${filePath}`)
  }
}

const truncateAndWriteCallbackP = (stringData) => (fileDescriptor, filePath, resolve, reject) => (err) => {
  if (!err) {
    // Write to the file and close it
    fs.writeFile(fileDescriptor, stringData, writeCallbackP(fileDescriptor, filePath, resolve, reject))
  } else {
    reject(err)
  }
}

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/')

// Write data to a file
lib.create = (dir, file, data, callback) => {
  // Open the file for writing

  const filePath = path.join(lib.baseDir, dir, `${file}.json`)
  const openCallback = (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data)
      // Write to file
      fs.writeFile(fileDescriptor, stringData, writeCallback(fileDescriptor, filePath, callback))
    } else {
      callback(`Could not create new file, it may already exist: ${filePath}`)
    }
  }
  fs.open(filePath, 'wx', openCallback)
}

lib.createP = (dir, file, data) => new Promise((resolve, reject) => {
    const filePath = path.join(lib.baseDir, dir, `${file}.json`)
    const openCallback = (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data)
        // Write to file
        fs.writeFile(fileDescriptor, stringData, writeCallbackP(fileDescriptor, filePath, resolve, reject))
      } else {
        reject(err)
      }
    }
    fs.open(filePath, 'wx', openCallback)
  })

lib.read = (dir, file, callback) => {
  const readCallback = (err, data) => {
    if (!err && data) {
      callback(false, helpers.parseJsonToObject(data))
    } else {
      callback(err, data)
    }
  }

  fs.readFile(path.join(lib.baseDir, dir, `${file}.json`), 'utf8', readCallback)
}

lib.readP = (dir, file) => new Promise((resolve, reject) => {
    const readCallback = (err, data) => {
      if (!err && data) {
        resolve(helpers.parseJsonToObject(data))
      } else {
        reject(err)
      }
    }
    fs.readFile(path.join(lib.baseDir, dir, `${file}.json`), 'utf8', readCallback)
  })

lib.update = (dir, file, data, callback) => {
  const filePath = path.join(lib.baseDir, dir, `${file}.json`)
  const openCallback = (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data)
      // Truncate the file
      fs.truncate(fileDescriptor, truncateAndWriteCallback(stringData)(fileDescriptor, filePath, callback))
    } else {
      callback(`Could not open the file for updating: ${filePath}`)
    }
  }
  fs.open(filePath, 'r+', openCallback)
}

lib.updateP = (dir, file, data) => new Promise((resolve, reject) => {
    const filePath = path.join(lib.baseDir, dir, `${file}.json`)
    const openCallback = (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data)
        // Truncate the file
        fs.truncate(fileDescriptor, truncateAndWriteCallbackP(stringData)(fileDescriptor, filePath, resolve, reject))
      } else {
        reject(err)
      }
    }
    fs.open(filePath, 'r+', openCallback)
  })

lib.delete = (dir, file, callback) => {
  const filePath = path.join(lib.baseDir, dir, `${file}.json`)
  // Unlink the file
  const unlinkCallback = (err) => (err ? callback(`Error deleting the file: ${filePath}`) : callback(false))
  fs.unlink(filePath, unlinkCallback)
}

lib.deleteP = (dir, file) => new Promise((resolve, reject) => {
    const filePath = path.join(lib.baseDir, dir, `${file}.json`)
    // Unlink the file
    const unlinkCallback = (err) => (err ? reject(err) : resolve())
    fs.unlink(filePath, unlinkCallback)
  })

// List all the items in the dir
lib.list = (dir, callback) => {
  fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
    if (err || (data && data.length === 0)) {
      callback(err, data)
    } else {
      const trimmedFileNames = data.map((fileName) => fileName.replace('.json', ''))
      callback(false, trimmedFileNames)
    }
  })
}

lib.listP = (dir) => new Promise((resolve, reject) => {
    fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
      if (err || (data && data.length === 0)) {
        reject(err, data)
      } else {
        const trimmedFileNames = data.map((fileName) => fileName.replace('.json', ''))
        resolve(trimmedFileNames)
      }
    })
  })

module.exports = lib
