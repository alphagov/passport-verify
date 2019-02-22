/**
 * A passport.js strategy for GOV.UK Verify
 */
/** */
import { Strategy } from 'passport-strategy'
import * as express from 'express'
import { createSamlForm } from './saml-form'
import VerifyServiceProviderClient from './verify-service-provider-client'
import { AuthnRequestResponse } from './verify-service-provider-api/authn-request-response'
import { TranslatedMatchingResponseBody, TranslatedIdentityResponseBody, Scenario } from './verify-service-provider-api/translated-response-body'
import { ResponseBody } from './verify-service-provider-api/response-body'
import { ErrorMessage } from './verify-service-provider-api/error-message'

/**
 * Configuration options and callbacks for the `PassportVerifyStrategy`.
 */
export interface PassportVerifyOptions {
}

/**
 * A passport.js strategy for GOV.UK Verify
 *
 * ```
 * passport.use(passportVerifyStrategy)
 * ```
 *
 * Users of `passport-verify` should use [[createStrategy]] to create
 * instances of `PassportVerifyStrategy` rather than calling the constructor directly.
 */
export class PassportVerifyStrategy extends Strategy {

  public name: string = 'verify'

  constructor (private client: VerifyServiceProviderClient,
               private createUser: (user: TranslatedMatchingResponseBody) => any,
               private verifyUser: (user: TranslatedMatchingResponseBody) => any,
               private handleIdentity: (identity: TranslatedIdentityResponseBody) => any,
               private saveRequestId: (requestId: string, request: express.Request) => any,
               private loadRequestId: (request: express.Request) => string,
               private serviceEntityId?: string,
               private samlFormTemplateName?: string,
               private levelOfAssurance: ('LEVEL_1' | 'LEVEL_2') = 'LEVEL_2') {
    super()
  }

  async authenticate (req: express.Request, options?: any) {
    try {
      await this._handleRequest(req)
    } catch (error) {
      this.error(error)
    }
  }

  success (user: any, info: TranslatedMatchingResponseBody | TranslatedIdentityResponseBody) { throw new Error('`success` should be overridden by passport') }
  fail (challenge: any, status?: number) { throw new Error('`fail` should be overridden by passport') }
  error (reason: Error) { throw reason }

  private _handleRequest (req: express.Request) {
    if (req.body && req.body.SAMLResponse) {
      return this._translateResponse(req as any)
    } else {
      return this._renderAuthnRequest(req as any)
    }
  }

  private async _translateResponse (req: express.Request) {
    const requestId = this.loadRequestId(req)
    const samlResponse = (req as any).body.SAMLResponse
    const response = await this.client.translateResponse(samlResponse, requestId, this.levelOfAssurance, this.serviceEntityId)
    switch (response.status) {
      case 200:
        if ((response.body as ResponseBody).scenario === Scenario.IDENTITY_VERIFIED) {
          await this._handleSuccessResponse(response.body as TranslatedIdentityResponseBody)
        } else {
          await this._handleSuccessMatchingResponse(response.body as TranslatedMatchingResponseBody)
        }
        break
      case 400:
      case 422:
      case 500:
        throw new Error((response.body as ErrorMessage).message)
      default:
        throw new Error(`Unexpected status ${response.status}`)
    }
  }

  private async _handleSuccessResponse (responseBody: TranslatedIdentityResponseBody) {
    switch (responseBody.scenario) {
      case Scenario.IDENTITY_VERIFIED:
        await this._handleIdentity(responseBody, this.handleIdentity)
        break
      default:
        this.fail(responseBody.scenario)
    }
  }

  private async _handleSuccessMatchingResponse (responseBody: TranslatedMatchingResponseBody) {
    switch (responseBody.scenario) {
      case Scenario.ACCOUNT_CREATION:
        await this._verifyUser(responseBody, this.createUser)
        break
      case Scenario.SUCCESS_MATCH:
        await this._verifyUser(responseBody, this.verifyUser)
        break
      default:
        this.fail(responseBody.scenario)
    }
  }

  private async _verifyUser (responseBody: TranslatedMatchingResponseBody, fetchUser: (user: TranslatedMatchingResponseBody) => any) {
    const user = await fetchUser(responseBody)
    if (user) {
      this.success(user, responseBody)
    } else {
      this.fail(Scenario.REQUEST_ERROR)
    }
    return Promise.resolve()
  }

  private async _handleIdentity (responseBody: TranslatedIdentityResponseBody, handleIdentity: (identity: TranslatedIdentityResponseBody) => any) {
    const identity = await handleIdentity(responseBody)
    if (identity) {
      this.success(identity, responseBody)
    } else {
      this.fail(Scenario.REQUEST_ERROR)
    }
    return Promise.resolve()
  }

  private async _renderAuthnRequest (request: express.Request): Promise<express.Response> {
    const authnRequestResponse = await this.client.generateAuthnRequest(this.levelOfAssurance, this.serviceEntityId)
    if (authnRequestResponse.status === 200) {
      const authnRequestResponseBody = authnRequestResponse.body as AuthnRequestResponse
      this.saveRequestId(authnRequestResponseBody.requestId, request)
      const response = (request as any).res
      if (this.samlFormTemplateName) {
        return response.render(this.samlFormTemplateName, { ssoLocation: authnRequestResponseBody.ssoLocation, samlRequest: authnRequestResponseBody.samlRequest })
      } else {
        return response.send(createSamlForm(authnRequestResponseBody.ssoLocation, authnRequestResponseBody.samlRequest))
      }
    } else {
      const errorBody = authnRequestResponse.body as ErrorMessage
      throw new Error(errorBody.message)
    }
  }
}

/**
 * Creates an instance of [[PassportVerifyStrategy]]
 *
 * This version of the function should only be used if your service uses the legacy setup. A legacy setup
 * involves connecting to GOV.UK Verify with a Matching Service Adapter (MSA).
 *
 * @param verifyServiceProviderHost The URL that the Verify Service Provider is running on (e.g. http://localhost:50400)
 * @param createUser A callback that will be invoked when a response with a new user is received.
 * The `user` object will contain the users' attributes (i.e. firstName, surname etc.).
 * Your callback should store details of the user in your datastore and return an object representing the user.
 * @param verifyUser A callback that will be invoked when a response with a matched user is received.
 * Your callback should look the user up in your datastore using their `pid` (persistent identitfier)
 * and return an object representing the user.
 * @param saveRequestId A callback that will be invoked to save the requestId that has been generated by
 * the verify service provider. Your callback should save the request Id in a secure manner so that it
 * can be matched against the corresponding SAML response.
 * @param loadRequestId A callback that will be invoked to load the requestId that has been securely saved
 * for the user's session.
 * @param serviceEntityId (Optional) The entityId that will be passed to the Verify Service Provider. This is
 * only required if the service provider is configured to be multi tenanted.
 * @param samlFormTemplateName (Optional) The name of a template in your service which will provide the form
 * used to post an authn request. If present, this will be rendered with the ssoLocation and samlRequest passed
 * in. Otherwise, a default form will be used. You should use this option if you wish to style the form, which
 * should be autoposting so only seen if the user has javascript disabled, to match the rest of your service.
 * @param levelOfAssurance (Optional) LEVEL_1 or LEVEL_2 - defaults to LEVEL_2. The Level of Assurance to
 * request from the Verify Service Provider and the minimum level to expect in the Response (e.g. if you
 * specify LEVEL_1 a LEVEL_2 Response would also be permissible).
 * @returns A strategy to be registered in passport with
 * ```
 * passport.use(passportVerifyStrategy)
 * ```
 */
export function createStrategy (
  verifyServiceProviderHost: string,
  createUser: (user: TranslatedMatchingResponseBody) => object | false,
  verifyUser: (user: TranslatedMatchingResponseBody) => object | false,
  saveRequestId: (requestId: string, request: express.Request) => void,
  loadRequestId: (request: express.Request) => string,
  serviceEntityId?: string,
  samlFormTemplateName?: string,
  levelOfAssurance?: ('LEVEL_1' | 'LEVEL_2')
) {
  const client = new VerifyServiceProviderClient(verifyServiceProviderHost)
  return new PassportVerifyStrategy(client, createUser, verifyUser, () => undefined, saveRequestId, loadRequestId, serviceEntityId, samlFormTemplateName, levelOfAssurance)
}

/**
 * Creates an instance of [[PassportVerifyStrategy]]
 *
 * This version of the function should only be used if your service connects to GOV.UK Verify using the
 * Verify Service Provider (VSP) without a Matching Service Adapter (MSA).
 *
 * @param verifyServiceProviderHost The URL that the Verify Service Provider is running on (e.g. http://localhost:50400)
 * @param handleIdentity A callback that will be invoked when a response with an identity is received.
 * The `identity` object will contain the users' attributes (i.e. firstName, surname etc.).
 * Your callback should store details of the user in your datastore and return an object representing the user.
 * @param saveRequestId A callback that will be invoked to save the requestId that has been generated by
 * the verify service provider. Your callback should save the request Id in a secure manner so that it
 * can be matched against the corresponding SAML response.
 * @param loadRequestId A callback that will be invoked to load the requestId that has been securely saved
 * for the user's session.
 * @param serviceEntityId (Optional) The entityId that will be passed to the Verify Service Provider. This is
 * only required if the service provider is configured to be multi tenanted.
 * @param samlFormTemplateName (Optional) The name of a template in your service which will provide the form
 * used to post an authn request. If present, this will be rendered with the ssoLocation and samlRequest passed
 * in. Otherwise, a default form will be used. You should use this option if you wish to style the form, which
 * should be autoposting so only seen if the user has javascript disabled, to match the rest of your service.
 * @param levelOfAssurance (Optional) LEVEL_1 or LEVEL_2 - defaults to LEVEL_2. The Level of Assurance to
 * request from the Verify Service Provider and the minimum level to expect in the Response (e.g. if you
 * specify LEVEL_1 a LEVEL_2 Response would also be permissible).
 * @returns A strategy to be registered in passport with
 * ```
 * passport.use(passportVerifyStrategy)
 * ```
 */

export function createIdentityStrategy (
  verifyServiceProviderHost: string,
  handleIdentity: (identity: TranslatedIdentityResponseBody) => object | false,
  saveRequestId: (requestId: string, request: express.Request) => void,
  loadRequestId: (request: express.Request) => string,
  serviceEntityId?: string,
  samlFormTemplateName?: string,
  levelOfAssurance?: ('LEVEL_1' | 'LEVEL_2')
) {
  const client = new VerifyServiceProviderClient(verifyServiceProviderHost)
  return new PassportVerifyStrategy(client, () => undefined, () => undefined, handleIdentity, saveRequestId, loadRequestId, serviceEntityId, samlFormTemplateName, levelOfAssurance)
}
