/**
 * Entry point for the passport-verify npm module.
 *
 * Exports [[createStrategy]] and [[createResponseHandler]] which can be used as follows:
 *
 * ```
 * const passportVerify = require('passport-verify')
 * passport.use(passportVerify.createStrategy(
 *   verifyServiceProviderHost,
 *   function identifyUser (user) { },
 *   function createUser (user) { },
 *   function verifyUser (user) { },
 *   function saveRequestId (requestId, request) { },
 *   function loadRequestId (request) { }
 * ))
 * ```
 *
 * ```
 * // route for authenticating a user
 * app.post('/verify/start', passport.authenticate('verify'))
 *
 * // route for handling a callback from verify
 * app.post('/verify/response', (req, res, next) => (
 *   passport.authenticate('verify',
 *     passportVerify.createResponseHandler({
 *       onIdentifyVerified => {},
 *       onMatch: user => {},
 *       onCreateUser: user => {},
 *       onAuthnFailed: failure => {},
 *       onError: error => {},
 *     })
 *   )
 * )(req, res, next))
 * ```
 */
/** */

import { createStrategy } from './passport-verify-strategy'
import {
  TranslatedResponseBody,
  Attributes,
  VerifiableAttribute,
  Address,
  Scenario
} from './verify-service-provider-api/translated-response-body'

import { createResponseHandler } from './create-response-handler'

export {
  createStrategy,
  createResponseHandler,
  TranslatedResponseBody,
  Attributes,
  VerifiableAttribute,
  Address,
  Scenario
}
