import * as assert from 'assert'
import { createIdentityResponseHandler, IdentityResponseScenarios } from '../lib/create-identity-response-handler'
import { Scenario } from '../lib/verify-service-provider-api/translated-response-body'
import * as td from 'testdouble'

function verifyNotCalled (fn: any) {
  td.verify(fn(), { times: 0, ignoreExtraArgs: true })
}

describe('The createIdentityResponseHandler function', () => {
  let scenarios: IdentityResponseScenarios
  let onIdentityVerified: any
  let onAuthnFailed: any
  let onNoAuthentication: any
  let onError: any

  beforeEach(() => {
    onIdentityVerified = td.function()
    onAuthnFailed = td.function()
    onNoAuthentication = td.function()
    onError = td.function()

    scenarios = {
      onIdentityVerified,
      onAuthnFailed,
      onNoAuthentication,
      onError
    }
  })

  it('should return a passport authenticate callback function', () => {
    const result = createIdentityResponseHandler(scenarios)
    assert.strictEqual(typeof result, 'function')
    assert.strictEqual(result.length, 4)
  })

  it('callback should call onMatch when called with an existing user', () => {
    const error = null as any
    const identity = {}
    const info = { scenario: Scenario.IDENTITY_VERIFIED, pid: '', levelOfAssurance: '' }
    const status = null as any

    createIdentityResponseHandler(scenarios)(error, identity, info, status)

    td.verify(onIdentityVerified(identity))

    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoAuthentication)
    verifyNotCalled(onError)
  })

  it('callback should call onAuthnFailed when called with no user and no error', () => {
    const error = null as any
    const identity = null
    const info = Scenario.AUTHENTICATION_FAILED
    const status = null as any

    createIdentityResponseHandler(scenarios)(error, identity, info, status)

    td.verify(onAuthnFailed())

    verifyNotCalled(onIdentityVerified)
    verifyNotCalled(onNoAuthentication)
    verifyNotCalled(onError)
  })

  it('callback should call onNoAuthentication when called with no user, no error, and a NO_AUTHENTICATION scenario', () => {
    const error = null as any
    const identity = null
    const info = Scenario.NO_AUTHENTICATION
    const status = null as any

    createIdentityResponseHandler(scenarios)(error, identity, info, status)

    td.verify(onNoAuthentication())

    verifyNotCalled(onIdentityVerified)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onError)
  })

  it('callback should call onError when called with no user, no error, and an inappropriate scenario', () => {
    const error = null as any
    const identity = null
    const info = Scenario.SUCCESS_MATCH
    const status = null as any

    createIdentityResponseHandler(scenarios)(error, identity, info, status)

    td.verify(onError(new Error('Unrecognised Scenario SUCCESS_MATCH')))

    verifyNotCalled(onIdentityVerified)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoAuthentication)
  })

  it('callback should call onError when called with no user, no error, and a REQUEST_ERROR info', () => {
    const error = null as any
    const identity = null
    const info = Scenario.REQUEST_ERROR
    const status = null as any

    createIdentityResponseHandler(scenarios)(error, identity, info, status)

    td.verify(onError(new Error('SAML Response was an error')))

    verifyNotCalled(onIdentityVerified)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoAuthentication)
  })

  it('callback should call onError when called with an error', () => {
    const error = new Error('some-really-bad-error')
    const identity = null
    const info = null as any
    const status = null as any

    createIdentityResponseHandler(scenarios)(error, identity, info, status)

    td.verify(onError(error))

    verifyNotCalled(onIdentityVerified)
    verifyNotCalled(onAuthnFailed)
    verifyNotCalled(onNoAuthentication)
  })
})
