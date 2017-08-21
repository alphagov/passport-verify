import * as assert from 'assert'
import * as http from 'http'
import VerifyServiceProviderClient from '../lib/verify-service-provider-client'
import * as td from 'testdouble'

describe('The passport-verify client', function () {

  const logger = { info: () => undefined }

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
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, logger)

    return client.generateAuthnRequest()
      .then(response => {
        assert.equal(response.status, 200)
        assert.deepEqual(response.body, exampleAuthnRequest)
      })
  })

  it('should translate response body', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, logger)

    return client.translateResponse(SUCCESS_SCENARIO, 'some-request-id')
      .then(response => {
        assert.equal(response.status, 200)
        assert.deepEqual(response.body, exampleTranslatedResponse)
      })
  })

  it('should resolve error responses', function () {
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, logger)

    return client.translateResponse(ERROR_SCENARIO, 'some-request-id')
      .then(response => {
        assert.equal(response.status, 422)
        assert.deepEqual(response.body, exampleErrorResponse)
      })
  })

  it('should log requests', function () {
    const testLogger = { info: td.function() as (message?: any, ...optionalParams: any[]) => void }
    const client = new VerifyServiceProviderClient(mockVerifyServiceProviderUrl, testLogger)

    return client.generateAuthnRequest()
      .then(response => {
        td.verify(testLogger.info('passport-verify', 'POST', 'http://localhost:3003/generate-request', { levelOfAssurance: 'LEVEL_2' }))
        td.verify(testLogger.info('passport-verify', { samlRequest: 'some-saml-req', requestId: 'some-request-id', ssoLocation: 'http://hub-sso-uri' }))
      })
  })

})
