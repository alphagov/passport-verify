/**
 *
 * create-response-handler
 *
 * Helper function to make handling callbacks from
 * `passport.authenticate('verify', callback)` easier.
 *
 * This is necessary because there are a number of different scenarios
 * that relying parties need to handle when dealing with Verify responses.
 * passport.js isn't aware of these, so the interface its provides is not ideal.
 */
/** */

import { TranslatedResponseBody } from './passport-verify-strategy'

/**
 * ResponseScenarios
 *
 * An object enumerating scenarios that can occur when handling a response from
 * Verify.
 *
 * Relying Parties should handle each of these scenarios appropriately.
 */
export interface ResponseScenarios {
  /**
   * Called when handling a success response from a user that was matched by your
   * matching service. Your callback should redirect the user to the appropriate
   * page so they can begin using your service.
   *
   * The callback will be provided with a `user` object, which will be whatever
   * was returned from your `verifyUser` callback.
   */
  onMatch: (user: any) => any,
  /**
   * Called when handling a success response from a user that was not matched by
   * your matching service, but who has had a new account created. Your callback
   * should redirect the user to the appropriate page so they can begin using your
   * service (you may or may not want to treat new users differently to existing users).
   *
   * The callback will be provided with a `user` object, which will be whatever
   * was returned from your `createUser` callback.
   */
  onCreateUser: (user: any) => any,
  /**
   * Called when the user failed to authenticate in a non-erroneous way.
   * For example if the user clicked cancel or got their password wrong.
   * Your callback should redirect the user to a page offering them other ways
   * to use your service (e.g. using a non-verify way of proving their
   * identity or going somewhere in person).
   *
   * The callback will be provided with a `failure` string, which can be one of
   *  - BAD_REQUEST
   *  - INTERNAL_SERVER_ERROR
   *  - AUTHENTICATION_FAILED
   *  - NO_MATCH
   *  - CANCELLATION
   *  - USER_NOT_ACCEPTED_ERROR
   */
  onAuthnFailed: (failure: string) => any,
  /**
   * Called when the response from verify can't be handled correctly
   * (for example if its signature is invalid or if its validUntil date
   * is in the past). Your callback should make sure the error is logged
   * appropriately and render an error page telling the user that there
   * are technical problems with Verify.
   *
   * The callback will be provided with an `error` object, which will provide
   * details of what went wrong.
   */
  onError: (error: Error) => any,
}

/**
 * To make handling the passport.authenticate() callback easier we provide a createResponseHandler
 * function. This takes separate callbacks for each of the response scenarios you have to handle
 * and returns a function that will call the appropriate callback when called by passport.
 *
 * @param responseScenarios Callbacks to handle each type of response that Verify can return
 */
export function createResponseHandler (responseScenarios: ResponseScenarios) {
  return function (error: Error, user: any, infoOrError: TranslatedResponseBody|string, status: number) {
    if (error) {
      return responseScenarios.onError(error)
    }
    if (user) {
      if ((infoOrError as TranslatedResponseBody).attributes) {
        return responseScenarios.onCreateUser(user)
      }
      return responseScenarios.onMatch(user)
    }
    return responseScenarios.onAuthnFailed(infoOrError as string)
  }
}
