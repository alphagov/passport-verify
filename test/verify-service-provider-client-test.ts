import * as assert from 'assert'
import * as http from 'http'
import VerifyServiceProviderClient from '../lib/verify-service-provider-client'
import * as td from 'testdouble'

describe('The passport-verify client', function () {
  const dummyLogger = {
    info: () => undefined,
    debug: () => undefined,
    error: () => undefined,
    warn: () => undefined
  }

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

  it('should generate authnRequest', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, dummyLogger)

    return client.generateAuthnRequest()
      .then(response => {
        assert.equal(response.status, 200)
        assert.deepEqual(response.body, exampleAuthnRequest)
      })
  })

  it('should translate response body', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, dummyLogger)

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id')
      .then(response => {
        assert.equal(response.status, 200)
        assert.deepEqual(response.body, exampleTranslatedResponse)
      })
  })

  it('should resolve error responses', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, dummyLogger)

    return client.translateResponse(ERROR_SCENARIO, 'some-request-id')
      .then(response => {
        assert.equal(response.status, 422)
        assert.deepEqual(response.body, exampleErrorResponse)
      })
  })

  it('should log generate-request requests at debug level', function () {
    const testLogger = {
      info: td.function() as (message?: any, ...optionalParams: any[]) => void,
      debug: td.function() as (message?: any, ...optionalParams: any[]) => void,
      error: td.function() as (message?: any, ...optionalParams: any[]) => void,
      warn: td.function() as (message?: any, ...optionalParams: any[]) => void
    }
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, testLogger)

    return client.generateAuthnRequest()
      .then(response => {
        td.verify(testLogger.debug(
          'passport-verify',
          'sending request: ',
          'POST',
          'http://localhost:3003/generate-request',
          { 'Content-Type': 'application/json' },
          { levelOfAssurance: 'LEVEL_2' }
        ))
        verifyNumberOfCalls(testLogger.debug, 1)
        verifyNotCalled(testLogger.warn)
        verifyNotCalled(testLogger.error)
      })
  })

  it('should log generate-request success responses at info level', () => {
    const testLogger = {
      info: td.function() as (message?: any, ...optionalParams: any[]) => void,
      debug: td.function() as (message?: any, ...optionalParams: any[]) => void,
      error: td.function() as (message?: any, ...optionalParams: any[]) => void,
      warn: td.function() as (message?: any, ...optionalParams: any[]) => void
    }
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, testLogger)

    return client.generateAuthnRequest()
      .then(response => {
        td.verify(testLogger.info('passport-verify', 'authn request generated, request id: ', 'some-request-id'))
        verifyNumberOfCalls(testLogger.info, 1)
        verifyNotCalled(testLogger.warn)
        verifyNotCalled(testLogger.error)
      })
  })

  describe('with generate-request erroring', () => {
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

    it('should log generate-request error responses at warning level', () => {
      const testLogger = {
        info: td.function() as (message?: any, ...optionalParams: any[]) => void,
        debug: td.function() as (message?: any, ...optionalParams: any[]) => void,
        error: td.function() as (message?: any, ...optionalParams: any[]) => void,
        warn: td.function() as (message?: any, ...optionalParams: any[]) => void
      }
      const client = new VerifyServiceProviderClient(erroringVerifyServiceProviderUrl, testLogger)

      return client.generateAuthnRequest()
        .then(response => {
          td.verify(testLogger.warn(
            'passport-verify',
            'error generating authn request: ',
            errorThatMatches(500, 'Internal Server Error'),
            'Enable debug logging to see full request'
          ))
          verifyNumberOfCalls(testLogger.warn, 1)
          verifyNotCalled(testLogger.info)
          verifyNotCalled(testLogger.error)
        })
    })
  })

  it('should log translate-response requests at debug level', function () {
    const testLogger = {
      info: td.function() as (message?: any, ...optionalParams: any[]) => void,
      debug: td.function() as (message?: any, ...optionalParams: any[]) => void,
      error: td.function() as (message?: any, ...optionalParams: any[]) => void,
      warn: td.function() as (message?: any, ...optionalParams: any[]) => void
    }
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, testLogger)

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id')
      .then(response => {
        td.verify(testLogger.debug(
          'passport-verify',
          'sending request: ',
          'POST',
          'http://localhost:3003/translate-response',
          { 'Content-Type': 'application/json' },
          { samlResponse: 'success', requestId: 'some-request-id', levelOfAssurance: 'LEVEL_2' }
        ))
        verifyNumberOfCalls(testLogger.debug, 1)
        verifyNotCalled(testLogger.warn)
        verifyNotCalled(testLogger.error)
      })
  })

  it('should log translate-response success responses at info level', () => {
    const testLogger = {
      info: td.function() as (message?: any, ...optionalParams: any[]) => void,
      debug: td.function() as (message?: any, ...optionalParams: any[]) => void,
      error: td.function() as (message?: any, ...optionalParams: any[]) => void,
      warn: td.function() as (message?: any, ...optionalParams: any[]) => void
    }
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, testLogger)

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id')
      .then(response => {
        td.verify(testLogger.info('passport-verify', 'response translated for request: ', 'some-request-id'))
        verifyNumberOfCalls(testLogger.info, 1)
        verifyNotCalled(testLogger.warn)
        verifyNotCalled(testLogger.error)
      })
  })

  it('should log translate-response error responses at warning level', function () {
    const testLogger = {
      info: td.function() as (message?: any, ...optionalParams: any[]) => void,
      debug: td.function() as (message?: any, ...optionalParams: any[]) => void,
      error: td.function() as (message?: any, ...optionalParams: any[]) => void,
      warn: td.function() as (message?: any, ...optionalParams: any[]) => void
    }
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, testLogger)

    return client.translateResponse(ERROR_SCENARIO, 'some-request-id')
      .then(response => {
        td.verify(testLogger.warn(
          'passport-verify',
          'error translating response for request id: ',
          'some-request-id',
          errorThatMatches(422, 'Unprocessable Entity'),
          'Enable debug logging to see full request'
        ))
        verifyNumberOfCalls(testLogger.warn, 1)
        verifyNotCalled(testLogger.info)
        verifyNotCalled(testLogger.error)
      })
  })

  function verifyNotCalled (func: (...args: any[]) => any): void {
    td.verify(func(), { times: 0, ignoreExtraArgs: true })
  }

  function verifyNumberOfCalls (func: (...args: any[]) => any, expectedCalls: number): void {
    td.verify(func(), { times: expectedCalls, ignoreExtraArgs: true })
  }

  function errorThatMatches (code: number, message: string): any {
    return td.matchers.argThat((actual: any) => {
      return actual.statusCode === code && actual.error.message === message
    })
  }
})
