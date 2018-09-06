/**
 * Primary file for the API
 */

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const fs = require('fs')
const config = require('./config')

// All the server logic for both http and https servers
const unifiedServer = function(req, res) {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true) // second param true means parse query string as well

  // Get the path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')

  // Get the query string as an object
  const queryStringObj = parsedUrl.query

  // Get HTTP Method
  const method = req.method.toLowerCase()

  // Get the headers as an object
  const headers = req.headers

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
      payload: buffer.join(''),
    }

    // Route the request to the handker soecified in the router
    const hanlderCallBack = (statusCode, payload) => {
      // Use the status code called back by handler, or default to 200
      statusCode = typeof statusCode === 'number' ? statusCode : 200

      // Use the payload called bach by th handler or default to an empty object
      payload = payload || {}

      // COnvert the payload to a string
      const payloadString = JSON.stringify(payload)

      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)

      res.end(payloadString)
      console.log(`Request statusCode: ${statusCode}, payload: ${payloadString}`)
    }
    chosenHandler(data, hanlderCallBack)

    res.end('Hi there 2')
    // Log the request path
  }
  req.on('end', endHander)

  // Send the response
}

// Instantiate the HTTP server
const httpServer = http.createServer(function(req, res) {
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

// Define a request router

const handlers = {}

// default handler
handlers.notFound = (data, cb) => {
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

const router = {
  ping: handlers.ping,
  default: handlers.notFound,
  hello: handlers.hello,
}
