/**
 * Types representing the JSON returned by the
 * `/translate-response` endpoint in the verify-service-provider
 */

/**
 * Represents the JSON returned by a success response from the
 * `/translate-response` endpoint in the verify-service-provider
 */
export interface ResponseBody {
  scenario: Scenario,
  pid: string,
  levelOfAssurance: string,
  attributes?: object
}

/**
 * An enumeration of response "Scenarios" - these represent all the things
 * a response from verify could mean.
 */
export enum Scenario {
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
  SUCCESS_MATCH = 'SUCCESS_MATCH',
  ACCOUNT_CREATION = 'ACCOUNT_CREATION',
  NO_MATCH = 'NO_MATCH',
  CANCELLATION = 'CANCELLATION',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  REQUEST_ERROR = 'REQUEST_ERROR'
}
