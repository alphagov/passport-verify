import { Strategy } from 'passport-strategy'
import * as express from 'express'
import { createSamlForm } from './saml-form'
import PassportVerifyClient from './passport-verify-client'

export interface AuthnRequestResponse {
  samlRequest: string,
  secureToken: string,
  location: string
}

export interface Address {
  verified?: boolean,
  lines?: string[],
  postCode?: string,
  internationalPostCode?: string,
  uprn?: string
}

export interface Attributes {
  firstName?: string,
  firstNameVerified?: boolean,
  middleName?: string,
  middleNameVerified?: boolean,
  surname?: string,
  surnameVerified?: boolean,
  dateOfBirth?: string,
  dateOfBirthVerified?: boolean,
  address?: Address,
  cycle3?: string
}

export interface TranslatedResponseBody {
  pid: string,
  levelOfAssurance: string,
  attributes?: Attributes
}

export interface ErrorBody {
  reason: string,
  message: string
}

export interface PassportVerifyOptions {
  verifyServiceProviderHost: string,
  logger: any,
  acceptUser: (user: TranslatedResponseBody) => any
}

export const USER_NOT_ACCEPTED_ERROR = Symbol('The user was not accepted by the application.')

export class PassportVerifyStrategy extends Strategy {

  public name: string = 'verify'

  constructor (private client: PassportVerifyClient,
               private acceptUser: (user: TranslatedResponseBody) => any) {
    super()
  }

  async authenticate (req: express.Request, options?: any) {
    try {
      await this._handleRequest(req)
    } catch (error) {
      this.error(error)
    }
  }

  _handleRequest (req: express.Request) {
    if (req.body && req.body.SAMLResponse) {
      return this._translateResponse(req.body.SAMLResponse)
    } else {
      return this._renderAuthnRequest((req as any).res)
    }
  }

  async _translateResponse (samlResponse: string) {
    const response = await this.client.translateResponse(samlResponse, 'TODO secure-cookie')
    if (response.status === 200) {
      const user = await this.acceptUser(response.body as TranslatedResponseBody)
      if (user) {
        this.success(user, response.body)
      } else {
        this.fail(USER_NOT_ACCEPTED_ERROR)
      }
    } else if ([400, 500].includes(response.status)) {
      const errorBody = response.body as ErrorBody
      throw new Error(errorBody.reason)
    } else if (response.status === 401) {
      const errorBody = response.body as ErrorBody
      this.fail(errorBody.reason, response.status)
    } else {
      throw new Error(response.body as any)
    }
  }

  async _renderAuthnRequest (response: express.Response): Promise<express.Response> {
    const authnRequestResponse = await this.client.generateAuthnRequest()
    if (authnRequestResponse.status === 200) {
      const authnRequestResponseBody = authnRequestResponse.body as AuthnRequestResponse
      return response.send(createSamlForm(authnRequestResponseBody.location, authnRequestResponseBody.samlRequest))
    } else {
      const errorBody = authnRequestResponse.body as ErrorBody
      throw new Error(errorBody.reason)
    }
  }

  success (user: any, info: any) { throw new Error('`success` should be overridden by passport') }
  fail (argv1: any, argv2?: any) { throw new Error('`fail` should be overridden by passport') }
  error (reason: Error) { throw reason }
}

export function createStrategy (options: PassportVerifyOptions) {
  const logger = options.logger || {
    info: () => undefined
  }

  const client = new PassportVerifyClient(options.verifyServiceProviderHost, logger)
  return new PassportVerifyStrategy(client, options.acceptUser)
}
