const Either = require('./monads/either')

const validators = {}

validators.notEmptyString = (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && result.length ? Either.Right({ [name]: result }) : Either.Left(`${name}: should not be empty`)
}

validators.isStringWithLength = (len) => (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && result.length === len
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be ${len} chars long`)
}

validators.isStringWithLengthLessThan = (len) => (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && result.length < len
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be less than ${len} chars long`)
}

validators.isPhoneNumberWithLength = (len) => (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && result.length === len
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be ${len} chars long`)
}

validators.isBooleanAndTrue = (name, value) => (typeof value === 'boolean' && value === true
    ? Either.Right({ [name]: true })
    : Either.Left(`${name}: should be boolean type and true`))
//  getValidationMessages :: [Either] -> [String]
validators.getValidationMessages = (validations) => {
  const getMessage = (errorMessage) => `${errorMessage}`
  const extractErrorMessages = (validator) => (validator.isLeft() ? getMessage(validator.left()) : null)
  const ignoreNull = (val) => val !== null
  return validations.map(extractErrorMessages).filter(ignoreNull)
}

// check protocol
validators.isProtocol = (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && ['https', 'http'].indexOf(result) >= 0
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be correct protocol string (http, https)`)
}
// check method
validators.isMethod = (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && ['get', 'post', 'put', 'delete'].indexOf(result) >= 0
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be correct method string (get, post, put, delete)`)
}
// check method
validators.isCheckDataState = (name, value) => {
  const result = typeof value === 'string' && value.trim()
  return result && ['up', 'down'].indexOf(result) >= 0
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be correct state string (up, down)`)
}

validators.isSuccessCodes = (name, value) => (Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === 'number')
    ? Either.Right({ [name]: value })
    : Either.Left(`${name}: should be an array of numbers`))

validators.isTimeoutSeconds = (name, value) => {
  const result = typeof value === 'number' && value % 1 === 0 && value > 0 && value < 6 && value
  return result ? Either.Right({ [name]: result }) : Either.Left(`${name}: should be a number between 1 and 5`)
}

validators.isNumberGreaterThan = (num) => (name, value) => {
  const result = typeof value === 'number' && value % 1 === 0 && value > num && value
  return result !== false
    ? Either.Right({ [name]: result })
    : Either.Left(`${name}: should be a number greater than ${num}, instead ${value}`)
}

validators.getValuesAsObject = (validations) => {
  const reducer = (acc, validation) => {
    if (validation.isRight()) {
      const obj = validation.right()
      const key = Object.keys(obj)[0]
      acc[key] = obj[key]
    }
    return acc
  }
  return validations.reduce(reducer, {})
}

module.exports = validators
