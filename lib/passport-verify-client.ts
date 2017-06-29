import fetch from 'node-fetch'
import { Response } from 'node-fetch'

export interface Logger {
  info: Function
}

export default class PassportVerifyClient {

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
    return this._request('POST', this.verifyServiceProviderHost + '/generate-request')
  }

  translateResponse (samlResponse: string, secureToken: string) {
    return this._request('POST', this.verifyServiceProviderHost + '/translate-response',
        { 'Content-Type': 'application/json' },
        `{ "response": "${samlResponse}", "secureToken": "${secureToken}" }`)
  }

}
