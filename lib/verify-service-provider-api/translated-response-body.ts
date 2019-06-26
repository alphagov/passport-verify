/**
 * Types representing the JSON returned by the
 * `/translate-response` endpoint in the verify-service-provider
 */

/**
 * Represents the JSON returned by a success response from the
 * `/translate-response` endpoint in the verify-service-provider
 * when configured for a matching type of journey.
 */

export interface TranslatedMatchingResponseBody {
  scenario: Scenario,
  pid: string,
  levelOfAssurance: string,
  attributes?: Attributes
}

/**
 * Represents the JSON returned by a success response from the
 * `/translate-response` endpoint in the verify-service-provider
 * when configured for a non-matching type of journey.
 */

export interface TranslatedIdentityResponseBody {
  scenario: Scenario,
  pid: string,
  levelOfAssurance: string,
  attributes?: IdentityAttributes
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
  NO_AUTHENTICATION = 'NO_AUTHENTICATION',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  REQUEST_ERROR = 'REQUEST_ERROR'
}

/**
 * User account creation attributes can be "verified" or "not verified".
 * "Verified" attributes have been checked by the Identity Provider (for
 * example on a driving licence or passport). "Not verified" attributes were
 * entered by the user and have not been checked.
 */
export interface VerifiableAttribute<T> {
  value: T,
  verified: boolean
}

/**
 * Identity attributes can be "verified" or "not verified".
 * "Verified" attributes have been checked by the Identity Provider (for
 * example on a driving licence or passport). "Not verified" attributes were
 * entered by the user and have not been checked.
 */

export interface VerifiableIdentityAttribute<T> {
  value: T,
  verified: boolean
  from?: string
  to?: string
}

/**
 * User account creation attributes - these will be present
 * on the response if the matching service returned "NO_MATCH"
 * and the service is configured to perform user account creation.
 */
export interface Attributes {
  firstName?: VerifiableAttribute<string>,
  middleName?: VerifiableAttribute<string>,
  surname?: VerifiableAttribute<string>,
  dateOfBirth?: VerifiableAttribute<string>,
  address?: VerifiableAttribute<Address>,
  addressHistory?: VerifiableAttribute<Address>[],
  cycle3?: string
}

/**
 * An `Address` user account creation attribute.
 */
export interface Address {
  lines?: string[],
  postCode?: string,
  internationalPostCode?: string,
  uprn?: string,
  fromDate?: string,
  toDate?: string
}

/**
 * Identity attributes - these will be present
 * on the response.
 */

export interface IdentityAttributes {
  firstNames?: VerifiableIdentityAttribute<string>[],
  middleNames?: VerifiableIdentityAttribute<string>[],
  surnames?: VerifiableIdentityAttribute<string>[],
  datesOfBirth?: VerifiableIdentityAttribute<string>[],
  gender?: string,
  addresses?: VerifiableIdentityAttribute<IdentityAddress>[]
}

/**
 * An `IdentityAddress` identity attribute.
 */

export interface IdentityAddress {
  lines?: string[],
  postCode?: string,
  internationalPostCode?: string,
  uprn?: string
}
