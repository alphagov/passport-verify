/**
 * Entry point for the passport-verify npm module.
 *
 * Exports [[createStrategy]], [[createIdentityStrategy]], [[createResponseHandler]] and [[createIdentityResponseHandler]].
 */
/** */

import { createStrategy, createIdentityStrategy } from './passport-verify-strategy'
import {
  TranslatedMatchingResponseBody,
  TranslatedIdentityResponseBody,
  Attributes,
  IdentityAttributes,
  VerifiableAttribute,
  VerifiableIdentityAttribute,
  Address,
  IdentityAddress,
  Scenario
} from './verify-service-provider-api/translated-response-body'

import { createResponseHandler } from './create-response-handler'
import { createIdentityResponseHandler } from './create-identity-response-handler'

export {
  createStrategy,
  createIdentityStrategy,
  createResponseHandler,
  createIdentityResponseHandler,
  TranslatedMatchingResponseBody,
  TranslatedIdentityResponseBody,
  Attributes,
  IdentityAttributes,
  VerifiableAttribute,
  VerifiableIdentityAttribute,
  Address,
  IdentityAddress,
  Scenario
}
