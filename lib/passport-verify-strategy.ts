/**
 * A passport.js strategy for GOV.UK Verify
 */
/** */
import { Strategy } from 'passport-strategy'
import * as express from 'express'
import { createSamlForm } from './saml-form'
import VerifyServiceProviderClient from './verify-service-provider-client'
import { AuthnRequestResponse } from './verify-service-provider-api/authn-request-response'
import { TranslatedResponseBody, Scenario } from './verify-service-provider-api/translated-response-body'
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
               private createUser: (user: TranslatedResponseBody) => any,
               private verifyUser: (user: TranslatedResponseBody) => any,
               private saveRequestId: (requestId: string, request: express.Request) => any,
               private loadRequestId: (request: express.Request) => string,
               private wrapSamlForm: (formHtml: string) => string = defaultStyleFormWrap) {
    super()
  }

  async authenticate (req: express.Request, options?: any) {
    try {
      await this._handleRequest(req)
    } catch (error) {
      this.error(error)
    }
  }

  success (user: any, info: TranslatedResponseBody) { throw new Error('`success` should be overridden by passport') }
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
    const response = await this.client.translateResponse(samlResponse, requestId)
    switch (response.status) {
      case 200:
        const responseBody = response.body as TranslatedResponseBody
        await this._handleSuccessResponse(responseBody)
        break
      case 400:
      case 422:
      case 500:
        throw new Error((response.body as ErrorMessage).message)
      default:
        throw new Error(`Unexpected status ${response.status}`)
    }
  }

  private async _handleSuccessResponse (responseBody: TranslatedResponseBody) {
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

  private async _verifyUser (responseBody: TranslatedResponseBody, fetchUser: (user: TranslatedResponseBody) => any) {
    const user = await fetchUser(responseBody)
    if (user) {
      this.success(user, responseBody)
    } else {
      this.fail(Scenario.REQUEST_ERROR)
    }
    return Promise.resolve()
  }

  private async _renderAuthnRequest (request: express.Request): Promise<express.Response> {
    const authnRequestResponse = await this.client.generateAuthnRequest()
    if (authnRequestResponse.status === 200) {
      const authnRequestResponseBody = authnRequestResponse.body as AuthnRequestResponse
      this.saveRequestId(authnRequestResponseBody.requestId, request)
      const response = (request as any).res
      return response.send(this.wrapSamlForm(createSamlForm(authnRequestResponseBody.ssoLocation, authnRequestResponseBody.samlRequest)))
    } else {
      const errorBody = authnRequestResponse.body as ErrorMessage
      throw new Error(errorBody.message)
    }
  }
}

function defaultStyleFormWrap (formContent: string): string {
  return `
    <style type='text/css'>
      .passport-verify-saml-form {
        font-family: Arial, sans-serif;
      }
      .passport-verify-button {
        background-color: #00692f;
        color: #fff;
        padding: 10px;
        font-size: 1em;
        border: none;
        box-shadow: 0 2px 0 #003618;
      }
    </style>
    ${formContent}
  `
}

/**
 * Creates an instance of [[PassportVerifyStrategy]]
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
 * @param wrapSamlForm (optional) A function that will be invoked on the html of the autoposting form to send an authn request.
 * This should wrap the form with any page headers or stylesheets you would like to be seen should a user have
 * javascript disabled. The html passed to this function will be a form with class 'passport-verify-saml-form', containing
 * text, hidden input fields, and a button with class 'passport-verify-button', along with javascript to autopost the form.
 * @returns A strategy to be registered in passport with
 * ```
 * passport.use(passportVerifyStrategy)
 * ```
 */
export function createStrategy (
  verifyServiceProviderHost: string,
  createUser: (user: TranslatedResponseBody) => object | false,
  verifyUser: (user: TranslatedResponseBody) => object | false,
  saveRequestId: (requestId: string, request: express.Request) => void,
  loadRequestId: (request: express.Request) => string,
  wrapSamlForm?: (formHtml: string) => string
) {
  const client = new VerifyServiceProviderClient(verifyServiceProviderHost)
  return new PassportVerifyStrategy(client, createUser, verifyUser, saveRequestId, loadRequestId, wrapSamlForm)
}
