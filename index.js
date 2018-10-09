/**
 * Primary file for the API
 */

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const { StringDecoder } = require('string_decoder')
const fs = require('fs')
const config = require('./lib/config')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')

const router = {
  ping: handlers.ping,
  default: handlers.notFound,
  hello: handlers.hello,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
}

// All the server logic for both http and https servers
const unifiedServer = function(req, res) {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true) // second param true means parse query string as well

  // Get the path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')
  console.log('trimmedPath', trimmedPath)

  // Get the query string as an object
  const queryStringObj = parsedUrl.query

  // Get HTTP Method
  const method = req.method.toLowerCase()
  console.log('method', method)

  // Get the headers as an object
  const { headers } = req

  // Get the payload if any
  const decoder = new StringDecoder('utf-8')
  const buffer = []
  const dataHander = function(data) {
    buffer.push(decoder.write(data))
  }
  req.on('data', dataHander)
  const endHander = function() {
    buffer.push(decoder.end())

    // Choose the handler this request should go to
    // If none is found choose default handler
    const chosenHandler = router[trimmedPath] || router.default

    // Construct the data object to send th the handler
    const data = {
      trimmedPath,
      queryStringObj,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer.join('')),
    }

    // Route the request to the handler soecified in the router
    const handlerCallBack = (statusCode, payload) => {
      // Use the status code called back by handler, or default to 200
      console.log('handlerCallBack, statusCode =', statusCode, typeof statusCode)
      const theStatusCode = typeof statusCode === 'number' ? statusCode : 200

      // Use the payload called bach by th handler or default to an empty object
      payload = payload || {}

      // COnvert the payload to a string
      const payloadString = JSON.stringify(payload)
      res.writeHead(theStatusCode, { 'Content-Type': 'application/json' })

      res.end(payloadString)
      // console.log(`Request statusCode: ${statusCode}, payload: ${payloadString}`)
    }
    chosenHandler(data, handlerCallBack)

    // Log the request path
  }
  req.on('end', endHander)

  // Send the response
}

// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res)
})

// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
}
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res)
})

// Start the HTTP server, and have it listen on port 3000
const httpListener = function() {
  console.log(`The server is listening on port ${config.httpPort} now\n Environment: ${config.envName}`)
}

httpServer.listen(config.httpPort, httpListener)

// Start HTTPS server

const httpsListener = function() {
  console.log(`The server is listening on port ${config.httpsPort} now\n Environment: ${config.envName}`)
}

httpsServer.listen(config.httpsPort, httpsListener)

module.exports = { httpServer }
