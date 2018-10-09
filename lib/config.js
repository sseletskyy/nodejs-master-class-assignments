/**
 * Create and export config vars
 */

// Container for all the env vats

const environments = {}

// Staging (default)

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
}

// Production env

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
}

// Determine which en was passed to command line
let chosenEnv = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : ''
chosenEnv = Object.keys(environments).includes(chosenEnv) ? chosenEnv : 'staging'

module.exports = environments[chosenEnv]
