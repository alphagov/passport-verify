import { PassportVerifyStrategy } from '../lib/passport-verify-strategy'
import { Scenario } from '../lib/verify-service-provider-api/translated-response-body'
import VerifyServiceProviderClient from '../lib/verify-service-provider-client'
import * as td from 'testdouble'

const anything = td.matchers.anything

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
      scenario: Scenario.SUCCESS_MATCH,
      pid: 'some-pid',
      levelOfAssurance: 'LEVEL_2',
      attributes: {}
    }
  }

  const exampleAccountCreationTranslatedResponse = {
    status: 200,
    body: {
      scenario: Scenario.ACCOUNT_CREATION,
      pid: 'some-pid',
      levelOfAssurance: 'LEVEL_2',
      attributes: {}
    }
  }

  const exampleNoMatchTranslatedResponse = {
    status: 200,
    body: {
      scenario: Scenario.NO_MATCH,
      pid: 'some-pid',
      levelOfAssurance: 'LEVEL_2',
      attributes: {}
    }
  }

  const exampleIdentityTranslatedResponse = {
    status: 200,
    body: {
      scenario: Scenario.IDENTITY_VERIFIED,
      pid: 'some-pid',
      levelOfAssurance: 'LEVEL_2',
      attributes: {}
    }
  }

  const exampleBadRequestResponse = {
    status: 400,
    body: {
      code: 400,
      message: 'Bad bad request'
    }
  }

  const exampleServiceErrorResponse = {
    status: 500,
    body: {
      code: 500,
      message: 'Internal Server Error'
    }
  }

  const exampleUser = {
    id: 1
  }

  const exampleIdentity = {
    firstName: 'Bob'
  }

  function createStrategy () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => exampleUser,
      () => exampleUser,
      () => undefined,
      () => undefined,
      () => 'some-request-id'
    ) as any
    return { mockClient, strategy }
  }

  it('should call generateAuthnRequest with the given entityId if one is set up', function () {
    const entityId = 'http://service-entity-id'
    const mockClient = { generateAuthnRequest: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      () => '',
      entityId
    )
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest('LEVEL_2', entityId)).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request)
  })

  it('should call generateAuthnRequest without an entityId if none has ben set up', function () {
    const mockClient = { generateAuthnRequest: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      () => ''
    )
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest('LEVEL_2', undefined)).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request)
  })

  it('should call generateAuthnRequest with LoA1 if requested', function () {
    const entityId = 'http://service-entity-id'
    const mockClient = { generateAuthnRequest: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      () => '',
      entityId,
      undefined,
      'LEVEL_1'
    )
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest('LEVEL_1', entityId)).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request)
  })

  it('should render a SAML AuthnRequest form if no template is provided', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      () => '')
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest(anything(), anything())).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request).then(() => {
      td.verify(request.res.send(td.matchers.contains(/some-saml-req/)))
      td.verify(request.res.send(td.matchers.contains(/http:\/\/hub-sso-uri/)))
    })
  })

  it('should render the provided template with ssoLocation and samlResponse if one has been provided', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      () => '',
      undefined,
      'formTemplate'
    )
    const request: any = { res: { render: td.function() } }
    td.when(mockClient.generateAuthnRequest(anything())).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request).then(() => {
      td.verify(request.res.render('formTemplate', { ssoLocation: exampleAuthnRequestResponse.body.ssoLocation, samlRequest: exampleAuthnRequestResponse.body.samlRequest }))
    })
  })

  it('should execute the saveRequestId callback', function () {
    const { mockClient, strategy } = createStrategy()
    strategy.saveRequestId = td.function()
    const request: any = { res: { send: td.function() } }
    td.when(mockClient.generateAuthnRequest(anything())).thenReturn(exampleAuthnRequestResponse)
    return strategy.authenticate(request).then(() => {
      td.verify(strategy.saveRequestId(exampleAuthnRequestResponse.body.requestId, request))
    })
  })

  it('should call translateResponse with the specified entityId if one is set up, for a matching set-up', function () {
    const entityId = 'http://service-entity-id'
    const mockClient = { translateResponse: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => exampleUser,
      () => exampleUser,
      () => undefined,
      () => undefined,
      () => 'some-request-id',
      entityId
    ) as any

    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', 'LEVEL_2', entityId)).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml)
  })

  it('should call translateResponse without an entityId if none is set up, for a matching set-up', function () {
    const mockClient = { translateResponse: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => exampleUser,
      () => exampleUser,
      () => undefined,
      () => undefined,
      () => 'some-request-id'
    ) as any

    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', 'LEVEL_2', undefined)).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml)
  })

  it('should call translateResponse with LoA1 if required, for a matching set-up', function () {
    const mockClient = { translateResponse: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => exampleUser,
      () => exampleUser,
      () => undefined,
      () => undefined,
      () => 'some-request-id',
      undefined,
      undefined,
      'LEVEL_1'
    ) as any

    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', 'LEVEL_1', undefined)).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml)
  })

  it('should call translateResponse with the specified entityId if one is set up, for a non-matching set-up', function () {
    const entityId = 'http://service-entity-id'
    const mockClient = { translateResponse: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => undefined,
      () => undefined,
      () => exampleIdentity,
      () => undefined,
      () => 'some-request-id',
      entityId
    ) as any

    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', 'LEVEL_2', entityId)).thenReturn(exampleIdentityTranslatedResponse)
    return strategy.authenticate(exampleSaml)
  })

  it('should call translateResponse without an entityId if none is set up, for a non-matching set-up', function () {
    const mockClient = { translateResponse: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => undefined,
      () => undefined,
      () => exampleIdentity,
      () => undefined,
      () => 'some-request-id'
    ) as any

    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', 'LEVEL_2', undefined)).thenReturn(exampleIdentityTranslatedResponse)
    return strategy.authenticate(exampleSaml)
  })

  it('should call translateResponse with LoA1 if required, for a non-matching set-up', function () {
    const mockClient = { translateResponse: td.function() }
    const strategy = new PassportVerifyStrategy(
      mockClient as any,
      () => undefined,
      () => undefined,
      () => exampleIdentity,
      () => undefined,
      () => 'some-request-id',
      undefined,
      undefined,
      'LEVEL_1'
    ) as any

    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', 'LEVEL_1', undefined)).thenReturn(exampleIdentityTranslatedResponse)
    return strategy.authenticate(exampleSaml)
  })

  it('should convert a successful SAML Response to the application user object', function () {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its success method to the Strategy instance
    strategy.success = td.function()
    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.success(td.matchers.contains(exampleUser), td.matchers.contains({ levelOfAssurance: 'LEVEL_2' })))
    })
  })

  it('should fail if the response is NO_MATCH', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => false,
      () => undefined,
      () => undefined,
      () => undefined,
      () => 'some-request-id'
    ) as any

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleNoMatchTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(Scenario.NO_MATCH))
    })
  })

  it('should fail if the application does not accept a new user', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => false,
      () => undefined,
      () => undefined,
      () => undefined,
      () => 'some-request-id'
    ) as any

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleAccountCreationTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(Scenario.REQUEST_ERROR))
    })
  })

  it('should fail if the application does not accept a known user', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => undefined,
      () => false,
      () => undefined,
      () => undefined,
      () => 'some-request-id'
    ) as any

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(Scenario.REQUEST_ERROR))
    })
  })

  it('should fail if the application does not handle an identity', function () {
    const mockClient = new MockClient()
    const strategy = new PassportVerifyStrategy(
      mockClient,
      () => undefined,
      () => undefined,
      () => false,
      () => undefined,
      () => 'some-request-id'
    ) as any

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.fail = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleIdentityTranslatedResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.fail(Scenario.REQUEST_ERROR))
    })
  })

  it('should error if the response is 400 from verify-service-provider', () => {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.error = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleBadRequestResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.error(new Error(exampleBadRequestResponse.body.message)))
    })
  })

  it('should error if the response is 500 from verify-service-provider', () => {
    const { mockClient, strategy } = createStrategy()

    // Mimicking passport's attaching of its fail method to the Strategy instance
    strategy.error = td.function()

    td.when(mockClient.translateResponse(exampleSaml.body.SAMLResponse, 'some-request-id', anything(), anything())).thenReturn(exampleServiceErrorResponse)
    return strategy.authenticate(exampleSaml).then(() => {
      td.verify(strategy.error(new Error(exampleServiceErrorResponse.body.message)))
    })
  })
})
