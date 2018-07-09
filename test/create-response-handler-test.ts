import * as assert from 'assert'
import { createResponseHandler, ResponseScenarios } from '../lib/create-response-handler'
import { Scenario } from '../lib/verify-service-provider-api/translated-response-body'
import * as td from 'testdouble'

function verifyNotCalled (fn: any) {
  td.verify(fn(), { times: 0, ignoreExtraArgs: true })
}

describe('The createResponseHandler function', () => {
  let scenarios: ResponseScenarios
  let onMatch: any
  let onCreateUser: any
  let onAuthnFailed: any
  let onNoMatch: any
  let onCancel: any
  let onError: any

  beforeEach(() => {
    onMatch = td.function()
    onCreateUser = td.function()
    onAuthnFailed = td.function()
    onNoMatch = td.function()
    onCancel = td.function()
    onError = td.function()

    scenarios = {
      onMatch,
      onCreateUser,
      onAuthnFailed,
      onNoMatch,
      onCancel,
      onError
    }
  })

  it('should return a passport authenticate callback function', () => {
    const result = createResponseHandler(scenarios)
    assert.strictEqual(typeof result, 'function')
    assert.strictEqual(result.length, 4)
  })

  it('callback should call onMatch when called with an existing user', () => {
    const error = null as any
    const user = {}
    const info = { scenario: Scenario.SUCCESS_MATCH, pid: '', levelOfAssurance: '' }
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onMatch(user))

    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onCancel)
    verifyNotCalled(onError)
  })

  it('callback should call onCreateUser when called with an new user', () => {
    const error = null as any
    const user = {}
    const info = { scenario: Scenario.ACCOUNT_CREATION, pid: '', levelOfAssurance: '', attributes: {} }
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onCreateUser(user))

    verifyNotCalled(onMatch)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onCancel)
    verifyNotCalled(onError)
  })

  it('callback should call onAuthnFailed when called with no user and no error', () => {
    const error = null as any
    const user = null
    const info = Scenario.AUTHENTICATION_FAILED
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onAuthnFailed())

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onCancel)
    verifyNotCalled(onError)
  })

  it('callback should call onNoMatch when called with no user, no error, and a NO_MATCH scenario', () => {
    const error = null as any
    const user = null
    const info = Scenario.NO_MATCH
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onNoMatch())

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onCancel)
    verifyNotCalled(onError)
  })

  it('callback should call onCancel when called with no user, no error, and a CANCELLATION scenario', () => {
    const error = null as any
    const user = null
    const info = Scenario.CANCELLATION
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onCancel())

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onError)
  })

  it('callback should call onError when called with no user, no error, and an inappropriate scenario', () => {
    const error = null as any
    const user = null
    const info = Scenario.SUCCESS_MATCH
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onError(new Error('Unrecognised Scenario SUCCESS_MATCH')))

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onCancel)
  })

  it('callback should call onError when called with no user, no error, and a REQUEST_ERROR info', () => {
    const error = null as any
    const user = null
    const info = Scenario.REQUEST_ERROR
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onError(new Error('SAML Response was an error')))

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onCancel)
  })

  it('callback should call onError when called with an error', () => {
    const error = new Error('some-really-bad-error')
    const user = null
    const info = null as any
    const status = null as any

    createResponseHandler(scenarios)(error, user, info, status)

    td.verify(onError(error))

    verifyNotCalled(onMatch)
    verifyNotCalled(onCreateUser)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoMatch)
    verifyNotCalled(onCancel)
  })
})
