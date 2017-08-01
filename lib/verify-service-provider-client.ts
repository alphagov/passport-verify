/**
 * An HTTP client that communicates with the Verify Service Provider.
 *
 * Users of `passport-verify` should use `createStrategy` rather than
 * instantiating this class directly.
 */
/** */
import { default as fetch, Response } from 'node-fetch'

export interface Logger {
  info (message?: any, ...optionalParams: any[]): void
}

export default class VerifyServiceProviderClient {

  constructor (private verifyServiceProviderHost: string, private logger: Logger) {}

  async _request (method: string, url: string, headers?: any, requestBody?: string): Promise<{ status: number, body: object }> {
    function parseBody (response: Response, body: string) {
      if (response.headers.get('content-type').includes('application/json')) return JSON.parse(body)
      else return body
    }

    this.logger.info('passport-verify', method, url, requestBody || '')
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: requestBody
    })
    const body = await response.text()
    this.logger.info('passport-verify', `${response.status} ${response.statusText}`, body)
    const parsedBody = parseBody(response, body)

    return {
      status: response.status,
      body: parsedBody
    }
  }

  generateAuthnRequest () {
    return this._request('POST', this.verifyServiceProviderHost + '/generate-request',
    { 'Content-Type': 'application/json' },
        `{ "levelOfAssurance": "LEVEL_2" }`)
  }

  translateResponse (samlResponse: string, requestId: string) {
    return this._request('POST', this.verifyServiceProviderHost + '/translate-response',
        { 'Content-Type': 'application/json' },
        `{ "samlResponse": "${samlResponse}", "requestId": "${requestId}" }`)
  }

}
