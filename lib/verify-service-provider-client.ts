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
}

export default class VerifyServiceProviderClient {

  constructor (private verifyServiceProviderHost: string, private logger: Logger) {}

  async _request (method: string, url: string, headers?: any, requestBody?: Object): Promise<{ status: number, body: object }> {
    this.logger.info('passport-verify', method, url, requestBody || '')
    try {
      const responseBody = await request({
        uri: url,
        method: method,
        json: true,
        headers: headers,
        body: requestBody
      })
      this.logger.info('passport-verify', responseBody)
      return {
        status: 200,
        body: responseBody
      }
    } catch (reason) {
      return {
        status: reason.statusCode,
        body: reason.error
      }
    }
  }

  generateAuthnRequest () {
    return this._request('POST', this.verifyServiceProviderHost + '/generate-request',
      { 'Content-Type': 'application/json' },
      { levelOfAssurance: 'LEVEL_2' })
  }

  translateResponse (samlResponse: string, requestId: string) {
    return this._request('POST', this.verifyServiceProviderHost + '/translate-response',
      { 'Content-Type': 'application/json' },
      { 'samlResponse': samlResponse, 'requestId': requestId, levelOfAssurance: 'LEVEL_2' })
  }
}
