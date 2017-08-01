import * as assert from 'assert'
import { PassportVerifyStrategy, USER_NOT_ACCEPTED_ERROR } from '../lib/passport-verify-strategy'
import VerifyServiceProviderClient from '../lib/verify-service-provider-client'
import * as td from 'testdouble'

describe('The passport-verify strategy', function () {

  const MockClient = td.constructor(VerifyServiceProviderClient)

  const exampleSaml = {
    body: {
      SAMLResponse: 'some-saml-response',
      requestId: 'some-request-id'
    }
  }

  const exampleAuthnRequestResponse = {
    status: 200,
    body: {
      samlRequest: 'some-saml-req',
      requestId: 'some-request-id',
      ssoLocation: 'http://hub-sso-uri'
    }
  }

  const exampleTranslatedResponse = {
    status: 200,
    body: {
      scenario: 'SUCCESS',
      pid: 'some-pid',
      levelOfAssurance: 'LEVEL_2',
      attributes: {}
    }
  }

  const exampleAuthenticationFailedResponse = {
    status: 401,
    body: {
      reason: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed'
    }
  }

  const exampleBadRequestResponse = {
    status: 400,
    body: {
      reason: 'Bad Request',
      message: 'Bad bad request'
    }
  }

  const exampleServiceErrorResponse = {
    status: 500,
    body: {
      reason: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error'
    }
  }

  const exampleUser = {
    id: 1
  }

  function createStrategy () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => exampleUser,
      () => exampleUser,
      () => undefined,
      () => 'some-request-id') as any
    return { mockClient, strategy }
  }

  it('should render a SAML AuthnRequest form', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => undefined,
      () => undefined,
      () => undefined,
      () => '')
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest()).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request).then(() => {
      td.verify(request.res.send(td.matchers.contains(/some-saml-req/)))
      td.verify(request.res.send(td.matchers.contains(/http:\/\/hub-sso-uri/)))
    })
  })

  it('should execute the saveRequestId callback', function () {
    const { mockClient, strategy } = createStrategy()
    strategy.saveRequestId = td.function()
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest()).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request).then(() => {
      td.verify(strategy.saveRequestId(exampleAuthnRequestResponse.body.requestId, request))
    })
  })

  it('should convert a successful SAML Response to the application user object', function () {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its success method to the Strategy instance
    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id')).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.success(td.matchers.contains(exampleUser), td.matchers.anything()))
    })
  })

  it('should fail if the application does not accept a new user', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => false,
      () => undefined,
      () => undefined,
      () => 'some-request-id'
    ) as any

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id')).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(USER_NOT_ACCEPTED_ERROR))
    })
  })

  it('should fail if the application does not accept a known user', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => undefined,
      () => false,
      () => undefined,
      () => 'some-request-id'
    ) as any

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id')).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(USER_NOT_ACCEPTED_ERROR))
    })
  })

  it('should fail if the response is 401 from verify-service-provider', () => {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id')).thenReturn(exampleAuthenticationFailedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(exampleAuthenticationFailedResponse.body.reason, exampleAuthenticationFailedResponse.status))
    })
  })

  it('should error if the response is 400 from verify-service-provider', () => {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.error = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id')).thenReturn(exampleBadRequestResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.error(new Error(exampleBadRequestResponse.body.reason)))
    })
  })

  it('should error if the response is 500 from verify-service-provider', () => {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.error = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id')).thenReturn(exampleServiceErrorResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.error(new Error(exampleServiceErrorResponse.body.reason)))
    })
  })

})
