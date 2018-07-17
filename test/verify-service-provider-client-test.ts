import * as assert from 'assert'
import * as http from 'http'
import VerifyServiceProviderClient from '../lib/verify-service-provider-client'
import * as td from 'testdouble'

describe('The passport-verify client', function () {
  const exampleAuthnRequest = {
    samlRequest: 'some-saml-req',
    requestId: 'some-request-id',
    ssoLocation: 'http://hub-sso-uri'
  }

  const exampleTranslatedResponse = {
    scenario: 'SUCCESS',
    pid: 'some-pid',
    levelOfAssurance: 'LEVEL_2',
    attributes: {}
  }

  const exampleErrorResponse = {
    code: 422,
    message: 'Unprocessable Entity'
  }

  const SUCCESS_SCENARIO = 'success'
  const ERROR_SCENARIO = 'unprocessable-entity'

  const mockVerifyServiceProviderUrl = 'http://localhost:3003'

  const mockVerifyServiceProvider = http.createServer((req, res) => {
    req.setEncoding('utf8')

    function generateAuthnRequest (req: http.IncomingMessage, res: http.ServerResponse) {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify(exampleAuthnRequest))
    }

    function translateResponse (req: http.IncomingMessage, res: http.ServerResponse) {
      res.setHeader('content-type', 'application/json')
      let data = ''
      req.on('data', (chunk) => data += chunk)
      req.on('end', () => {
        const json = JSON.parse(data)
        if (json.samlResponse === SUCCESS_SCENARIO) {
          res.statusCode = 200
          res.end(JSON.stringify(exampleTranslatedResponse))
        } else if (json.samlResponse === ERROR_SCENARIO) {
          res.statusCode = 422
          res.end(JSON.stringify(exampleErrorResponse))
        } else {
          res.statusCode = 400
          res.end(JSON.stringify({
            reason: 'Bad request',
            message: 'bad request'
          }))
        }
      })
    }

    function notFound (req: http.IncomingMessage, res: http.ServerResponse) {
      res.statusCode = 404
      res.end('Not Found')
    }

    if (req.method === 'POST' && req.url && req.url.includes('/generate-request')) {
      generateAuthnRequest(req, res)
    } else if (req.method === 'POST' && req.url && req.url.includes('/translate-response')) {
      translateResponse(req, res)
    } else {
      notFound(req, res)
    }
  })

  beforeEach((done) => {
    mockVerifyServiceProvider.listen(3003, done)
  })

  afterEach((done) => {
    mockVerifyServiceProvider.close(done)
  })

  it('should generate authnRequest when not passed an entityId', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    return client.generateAuthnRequest('LEVEL_2')
      .then(response => {
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(response.body, exampleAuthnRequest)
      })
  })

  it('should generate authnRequest when passed an entityId', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)
    const entityId = 'http://service-entity-id'

    return client.generateAuthnRequest('LEVEL_2', entityId)
      .then(response => {
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(response.body, exampleAuthnRequest)
      })
  })

  it('should translate response body when not passed an entityId', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id', 'LEVEL_2')
      .then(response => {
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(response.body, exampleTranslatedResponse)
      })
  })

  it('should translate response body when passed an entityId', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)
    const entityId = 'http://service-entity-id'

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id', 'LEVEL_2', entityId)
      .then(response => {
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(response.body, exampleTranslatedResponse)
      })
  })

  it('should resolve error responses', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    return client.translateResponse(ERROR_SCENARIO, 'some-request-id', 'LEVEL_2')
      .then(response => {
        assert.strictEqual(response.status, 422)
        assert.deepStrictEqual(response.body, exampleErrorResponse)
      })
  })

  it('should log generate-request requests to the request log', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    const testLogger = td.function() as (message?: any, ...optionalParams: any[]) => void
    client.requestLog = testLogger as any

    return client.generateAuthnRequest('LEVEL_2', 'http://service-entity-id')
      .then(response => {
        td.verify(testLogger(
          'sending request: ',
          'POST',
          'http://localhost:3003/generate-request',
          { 'Content-Type': 'application/json' },
          { entityId: 'http://service-entity-id', levelOfAssurance: 'LEVEL_2' }
        ))
      })
  })

  it('should log generate-request success responses to the info log', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    const testLogger = td.function() as (message?: any, ...optionalParams: any[]) => void
    client.infoLog = testLogger as any

    return client.generateAuthnRequest('LEVEL_2')
      .then(response => {
        td.verify(testLogger('authn request generated, request id: ', 'some-request-id'))
      })
  })

  describe('with generate-request erroring', function () {
    const erroringVerifyServiceProviderUrl = 'http://localhost:3004'
    const erroringVerifyServiceProvider = http.createServer((req, res) => {
      req.setEncoding('utf8')

      function generateAuthnRequest (req: http.IncomingMessage, res: http.ServerResponse) {
        res.statusCode = 500
        res.end(JSON.stringify({ code: 500, message: 'Internal Server Error' }))
      }

      generateAuthnRequest(req, res)
    })

    beforeEach((done) => {
      erroringVerifyServiceProvider.listen(3004, done)
    })

    afterEach((done) => {
      erroringVerifyServiceProvider.close(done)
    })

    it('should log generate-request error responses to the info log', function () {
      const client = new VerifyServiceProviderClient(erroringVerifyServiceProviderUrl)

      const testLogger = td.function() as (message?: any, ...optionalParams: any[]) => void
      client.infoLog = testLogger as any

      return client.generateAuthnRequest('LEVEL_2')
        .then(response => {
          td.verify(testLogger(
            'error generating authn request: ',
            errorThatMatches(500, 'Internal Server Error'),
            'Use "passport-verify:requests" log to see full request'
          ))
        })
    })
  })

  it('should log translate-response requests to the request log', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    const testLogger = td.function() as (message?: any, ...optionalParams: any[]) => void
    client.requestLog = testLogger as any

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id', 'LEVEL_2')
      .then(response => {
        td.verify(testLogger(
          'sending request: ',
          'POST',
          'http://localhost:3003/translate-response',
          { 'Content-Type': 'application/json' },
          { samlResponse: 'success', requestId: 'some-request-id', levelOfAssurance: 'LEVEL_2' }
        ))
      })
  })

  it('should log translate-response success responses to the info log', () => {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    const testLogger = td.function() as (message?: any, ...optionalParams: any[]) => void
    client.infoLog = testLogger as any

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id', 'LEVEL_2')
      .then(response => {
        td.verify(testLogger('response translated for request: ', 'some-request-id', 'Scenario: ', 'SUCCESS'))
      })
  })

  it('should log translate-response error responses to the info log', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl)

    const testLogger = td.function() as (message?: any, ...optionalParams: any[]) => void
    client.infoLog = testLogger as any

    return client.translateResponse(ERROR_SCENARIO, 'some-request-id', 'LEVEL_2')
      .then(response => {
        td.verify(testLogger(
          'error translating response for request id: ',
          'some-request-id',
          errorThatMatches(422, 'Unprocessable Entity'),
          'Use "passport-verify:requests" log to see full request'
        ))
      })
  })

  function errorThatMatches (code: number, message: string): any {
    return td.matchers.argThat((actual: any) => {
      return actual.statusCode === code && actual.error.message === message
    })
  }
})
