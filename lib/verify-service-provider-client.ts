/**
 * An HTTP client that communicates with the Verify Service Provider.
 *
 * Users of `passport-verify` should use `createStrategy` rather than
 * instantiating this class directly.
 */
/** */
import * as request from 'request-promise-native'

export interface Logger {
  info (message?: any, ...optionalParams: any[]): void
  debug (message?: any, ...optionalParams: any[]): void
  error (message?: any, ...optionalParams: any[]): void
  warning (message?: any, ...optionalParams: any[]): void
}

export default class VerifyServiceProviderClient {

  constructor (private verifyServiceProviderHost: string, private logger: Logger) {}

  sendRequest (endpoint: string, requestBody?: Object): request.RequestPromise {
    const url = this.verifyServiceProviderHost + endpoint
    const headers = { 'Content-Type': 'application/json' }
    this.logger.debug('passport-verify', 'sending request: ', 'POST', url, headers, requestBody || '')
    return request({
      uri: url,
      method: 'POST',
      json: true,
      headers: headers,
      body: requestBody
    })
  }

  generateAuthnRequest (): Promise<{ status: number, body: object }> {
    return this.sendRequest(
      '/generate-request',
      { levelOfAssurance: 'LEVEL_2' }
    ).then(responseBody => {
      this.logger.info('passport-verify', 'authn request generated, request id: ', responseBody.requestId)
      return {
        status: 200,
        body: responseBody
      }
    }).catch(reason => {
      this.logger.warning('passport-verify', 'error generating authn request: ', reason, 'Enable debug logging to see full request')
      return {
        status: reason.statusCode,
        body: reason.error
      }
    })
  }

  translateResponse (samlResponse: string, requestId: string): Promise<{ status: number, body: object }> {
    return this.sendRequest(
      '/translate-response',
      { 'samlResponse': samlResponse, 'requestId': requestId, levelOfAssurance: 'LEVEL_2' }
    ).then(responseBody => {
      this.logger.info('passport-verify', 'response translated for request: ', requestId)
      return {
        status: 200,
        body: responseBody
      }
    }).catch(reason => {
      this.logger.warning('passport-verify', 'error translating response for request id: ', requestId, reason, 'Enable debug logging to see full request')
      return {
        status: reason.statusCode,
        body: reason.error
      }
    })
  }
}
