// Dependencies
const server = require('./lib/server')
const workers = require('./lib/workers')

//Declare the app
const app = {}

// Init
app.init = () => {
  server.init()
  workers.init()
}

// Execute
app.init()

// Export the app

module.exports = app
