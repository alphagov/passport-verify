import * as assert from 'assert'
import { createResponseHandler, Scenarios } from '../lib/helpers'
import * as td from 'testdouble'

function verifyNotCalled (fn: any) {
  td.verify(fn(), { times: 0, ignoreExtraArgs: true })
}

describe('The createResponseHandler function', () => {
  let scenarios: Scenarios
  let onMatch: any
  let onCreateUser: any
  let onAuthnFailed: any
  let onError: any

  beforeEach(() => {
    onMatch = td.function()
    onCreateUser = td.function()
    onAuthnFailed = td.function()
    onError = td.function()

    scenarios = {
      onMatch,
      onCreateUser,
      onAuthnFailed,
      onError
    }
  })

  it('should return a passport authenticate callback function', () => {
    const result = createResponseHandler(scenarios)
    assert.equal(typeof result, 'function')
    assert.equal(result.length, 4)
  })

  it('callback should call onMatch when called with an existing user', () => {
    const error = null
    const user = { _isNewUser: false }
    const info = null
    const status = null

    const result = createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onMatch(user))

    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onError)
  })

  it('callback should call onCreateUser when called with an new user', () => {
    const error = null
    const user = { _isNewUser: true }
    const info = null
    const status = null

    const result = createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onCreateUser(user))

    verifyNotCalled(onMatch)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onError)
  })

  it('callback should call onAuthnFailed when called with no user and no error', () => {
    const error = null
    const user = null
    const info = 'some-failure-message'
    const status = null

    const result = createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onAuthnFailed(info))

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onError)
  })

  it('callback should call onError when called with an error', () => {
    const error = 'some-really-bad-error'
    const user = null
    const info = null
    const status = null

    const result = createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onError(error))

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
  })
})
