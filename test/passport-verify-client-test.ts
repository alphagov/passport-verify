import * as assert from 'assert'
import * as http from 'http'
import PassportVerifyClient from '../lib/passport-verify-client'
import * as td from 'testdouble'

describe('The passport-verify client', function () {

  const logger = { info: () => undefined }

  const exampleAuthnRequest = {
    samlRequest: 'some-saml-req',
    secureToken: 'some-secure-token',
    location: 'http://hub-sso-uri'
  }

  const exampleTranslatedResponse = {
    scenario: 'SUCCESS',
    pid: 'some-pid',
    levelOfAssurance: 'LEVEL_2',
    attributes: {}
  }

  const exampleAuthenticationFailedResponse = {
    reason: 'AUTHENTICATION_FAILED',
    message: 'Authentication failed'
  }

  const AUTHENTICATION_FAILED_SCENARIO = 'authentication-failed'
  const SUCCESS_SCENARIO = 'success'

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
        if (JSON.parse(data).response === AUTHENTICATION_FAILED_SCENARIO) {
          res.statusCode = 401
          res.end(JSON.stringify(exampleAuthenticationFailedResponse))
        } else if (JSON.parse(data).response === SUCCESS_SCENARIO) {
          res.statusCode = 200
          res.end(JSON.stringify(exampleTranslatedResponse))
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
    const client = new PassportVerifyClient(mockVerifyServiceProviderUrl, logger)

    return client.generateAuthnRequest()
      .then(response => {
        assert.equal(response.status, 200)
        assert.deepEqual(response.body, exampleAuthnRequest)
      })
  })

  it('should translate response body', function () {
    const client = new PassportVerifyClient(mockVerifyServiceProviderUrl, logger)

    return client.translateResponse(SUCCESS_SCENARIO, 'some-secure-token')
      .then(response => {
        assert.equal(response.status, 200)
        assert.deepEqual(response.body, exampleTranslatedResponse)
      })
  })

  it('should resolve error responses', function () {
    const client = new PassportVerifyClient(mockVerifyServiceProviderUrl, logger)

    return client.translateResponse(AUTHENTICATION_FAILED_SCENARIO, 'some-secure-token')
      .then(response => {
        assert.equal(response.status, 401)
        assert.deepEqual(response.body, exampleAuthenticationFailedResponse)
      })
  })

  it('should log requests', function () {
    const testLogger = { info: td.function() }
    const client = new PassportVerifyClient(mockVerifyServiceProviderUrl, testLogger)

    return client.generateAuthnRequest()
      .then(response => {
        td.verify(testLogger.info('passport-verify', 'POST', 'http://localhost:3003/generate-request', ''))
        td.verify(testLogger.info('passport-verify', '200 OK', '{\"samlRequest\":\"some-saml-req\",\"secureToken\":\"some-secure-token\",\"location\":\"http://hub-sso-uri\"}'))
      })
  })

})
