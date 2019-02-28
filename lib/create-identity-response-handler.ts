/**
 * The contents of this file are only relevant if your service connects
 * to GOV.UK Verify using the Verify Service Provider (VSP) without a Matching
 * Service Adapter (MSA).
 *
 *
 * create-identity-response-handler
 *
 * Helper function to make handling callbacks from
 * `passport.authenticate('verify', callback)` easier.
 *
 * This is necessary because there are a number of different scenarios
 * that services need to handle when dealing with Verify responses.
 * passport.js isn't aware of these, so the interface it provides is not ideal.
 */
/** */

import { TranslatedIdentityResponseBody, Scenario } from './verify-service-provider-api/translated-response-body'

/**
 * The callbacks in the `IdentityResponseScenarios` interface define scenarios that
 * can occur when handling a response from GOV.UK Verify.
 *
 * Services should handle each of these scenarios appropriately.
 */
export interface IdentityResponseScenarios {

  /**
   * Called when handling an `IDENTITY_VERIFIED` response. Your callback should
   * redirect the user to the appropriate page so they can begin using your service.
   *
   * The callback will be passed an `identity` object, which will be the output from
   * your `handleIdentity` callback.
   */
  onIdentityVerified: (user: any) => any,

  /**
   * Called when the user failed to verify, for example if the user got their
   * password wrong.
   *
   * Your callback should redirect the user to a page offering them other ways
   * to use your service (e.g. using a non-verify way of proving their
   * identity or going somewhere in person).
   */
  onAuthnFailed: () => any,

  /**
   * Called when the user fails to authenticate or times out at the identity provider (e.g. because
   * they don't have the required documentation with them).
   *
   * Your callback should redirect the user to a page offering them other ways
   * to use your service (e.g. using a non-verify way of proving their
   * identity or going somewhere in person).
   */
  onNoAuthentication: () => any,

  /**
   * Called when the response from verify can't be handled correctly
   * (for example if its signature is invalid or if its validUntil date
   * is in the past), or if the response from verify represents an error.
   *
   * Your callback should make sure the error is logged appropriately and
   * render an error page telling the user that there are technical problems
   * with Verify.
   *
   * The callback will be provided with an `error` object, which will provide
   * details of what went wrong.
   */
  onError: (error: Error) => any,
}

/**
 * The `createIdentityResponseHandler` function should be used if your service
 * connects to GOV.UK Verify using the Verify Service Provider (VSP) without a
 * Matching Service Adapter (MSA)
 *
 * This function makes it easier to handle the passport.authenticate() callback. The
 * function takes separate callbacks for each of the response scenarios you have to
 * handle and returns a function that will invoke the appropriate callback when called
 * by passport.
 *
 * @param responseScenarios Callbacks to handle each type of response that GOV.UK Verify can return
 */
export function createIdentityResponseHandler (responseScenarios: IdentityResponseScenarios) {
  return function (error: Error, identity: any, infoOrError: TranslatedIdentityResponseBody | Scenario, status: number) {
    if (error) {
      return responseScenarios.onError(error)
    }
    if (identity) {
      const responseBody = infoOrError as TranslatedIdentityResponseBody
      return responseScenarios.onIdentityVerified(identity)
    }

    switch (infoOrError as Scenario) {
      case Scenario.REQUEST_ERROR:
        return responseScenarios.onError(new Error('SAML Response was an error'))
      case Scenario.NO_AUTHENTICATION:
        return responseScenarios.onNoAuthentication()
      case Scenario.AUTHENTICATION_FAILED:
        return responseScenarios.onAuthnFailed()
      default:
        return responseScenarios.onError(new Error(`Unrecognised Scenario ${infoOrError}`))
    }
  }
}
