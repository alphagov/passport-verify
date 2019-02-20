/**
 * An HTTP client that communicates with the Verify Service Provider.
 *
 * Users of `passport-verify` should use `createStrategy` rather than
 * instantiating this class directly.
 */
/** */
import * as request from 'request-promise-native'
import * as debug from 'debug'
import { AuthnRequestResponse } from './verify-service-provider-api/authn-request-response'
import { TranslatedMatchingResponseBody, TranslatedIdentityResponseBody, Scenario } from './verify-service-provider-api/translated-response-body'
import { ResponseBody } from './verify-service-provider-api/response-body'

import { ErrorMessage } from './verify-service-provider-api/error-message'

export default class VerifyServiceProviderClient {
  infoLog = debug('passport-verify:log')
  requestLog = debug('passport-verify:requests')

  constructor (private verifyServiceProviderHost: string) {}

  async generateAuthnRequest (levelOfAssurance: ('LEVEL_1' | 'LEVEL_2'), entityId?: string): Promise<{ status: number, body: AuthnRequestResponse | ErrorMessage }> {
    try {
      let requestBody: any = { levelOfAssurance }
      if (entityId) {
        requestBody.entityId = entityId
      }

      const responseBody = await this.sendRequest<AuthnRequestResponse>('/generate-request', requestBody)
      this.infoLog('authn request generated, request id: ', responseBody.requestId)
      return {
        status: 200,
        body: responseBody
      }
    } catch (reason) {
      this.infoLog('error generating authn request: ', reason, 'Use "passport-verify:requests" log to see full request')
      return {
        status: reason.statusCode,
        body: reason.error
      }
    }
  }

  async translateResponse (samlResponse: string, requestId: string, levelOfAssurance: ('LEVEL_1' | 'LEVEL_2'), entityId?: string): Promise<{ status: number, body: TranslatedMatchingResponseBody | TranslatedIdentityResponseBody | ErrorMessage }> {
    try {
      let requestBody: any = { samlResponse, requestId, levelOfAssurance: levelOfAssurance }
      if (entityId) {
        requestBody.entityId = entityId
      }

      const responseBody = await this.sendRequest<ResponseBody>('/translate-response', requestBody)
      const translatedResponseBody = responseBody.scenario === Scenario.IDENTITY_VERIFIED ? responseBody as TranslatedIdentityResponseBody : responseBody as TranslatedMatchingResponseBody

      this.infoLog('response translated for request: ', requestId, 'Scenario: ', responseBody.scenario)
      return {
        status: 200,
        body: translatedResponseBody
      }
    } catch (reason) {
      this.infoLog('error translating response for request id: ', requestId, reason, 'Use "passport-verify:requests" log to see full request')
      return {
        status: reason.statusCode,
        body: reason.error
      }
    }
  }

  private async sendRequest<T extends AuthnRequestResponse | TranslatedMatchingResponseBody | TranslatedIdentityResponseBody> (endpoint: string, requestBody?: Object): Promise<T> {
    const url = this.verifyServiceProviderHost + endpoint
    const headers = { 'Content-Type': 'application/json' }
    this.requestLog('sending request: ', 'POST', url, headers, requestBody || '')
    return request({
      uri: url,
      method: 'POST',
      json: true,
      headers: headers,
      body: requestBody
    })
  }
}
