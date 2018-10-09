const util = require('util')

const InvalidOptionError = function(message, error) {
  this.error = error
  this.name = 'InvalidOptionError'

  Error.call(this, message)
  Error.captureStackTrace(this, arguments)
}

util.inherits(InvalidOptionError, Error)

const Either = function(left, right) {
  this._left = left
  this._right = right
}

Either.prototype.left = function() {
  return this._left
}

Either.prototype.isLeft = function() {
  return !!this._left
}

Either.prototype.right = function() {
  return this._right
}

Either.prototype.isRight = function() {
  return !!this._right
}

Either.prototype.cata = function(leftOption, rightOption) {
  if (typeof leftOption !== 'function')
    throw new InvalidOptionError('The specified left option parameter should be a function.')

  if (typeof rightOption !== 'function')
    throw new InvalidOptionError('The specified right option parameter should be a function.')

  this._left ? leftOption(this._left) : rightOption(this._right)
}

Either.Left = function(left) {
  return new Either(left, null)
}

Either.Right = function(right) {
  return new Either(null, right)
}

module.exports = Either
