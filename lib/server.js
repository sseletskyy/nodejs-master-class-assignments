/**
 * Server related tasks
 */

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const { StringDecoder } = require('string_decoder')
const fs = require('fs')
const path = require('path')
const config = require('./config')
const handlers = require('./handlers')
const helpers = require('./helpers')

// Instantiate the server module object

const server = {}

server.router = {
  ping: handlers.ping,
  default: handlers.notFound,
  hello: handlers.hello,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
}

// All the server logic for both http and https servers
server.unifiedServer = function(req, res) {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true) // second param true means parse query string as well

  // Get the path
  const trimmedPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '')
  console.log('trimmedPath', trimmedPath) // eslint-disable-line no-console

  // Get the query string as an object
  const queryStringObj = parsedUrl.query

  // Get HTTP Method
  const method = req.method.toLowerCase()
  console.log('method', method) // eslint-disable-line no-console

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
    const chosenHandler = server.router[trimmedPath] || server.router.default

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
      console.log('handlerCallBack, statusCode =', statusCode, typeof statusCode) // eslint-disable-line no-console
      const theStatusCode = typeof statusCode === 'number' ? statusCode : 200

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload || {})
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
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res)
})

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
}
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res)
})

server.init = () => {
  // Start the HTTP server, and have it listen on port 3000
  const httpListener = function() {
    console.log(`The server is listening on port ${config.httpPort} now\n Environment: ${config.envName}`) // eslint-disable-line no-console
  }

  server.httpServer.listen(config.httpPort, httpListener)

  // Start HTTPS server

  const httpsListener = function() {
    console.log(`The server is listening on port ${config.httpsPort} now\n Environment: ${config.envName}`) // eslint-disable-line no-console
  }

  server.httpsServer.listen(config.httpsPort, httpsListener)
}

module.exports = server
