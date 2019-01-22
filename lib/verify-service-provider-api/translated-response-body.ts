export interface TranslatedResponseBody {
  scenario: Scenario,
  pid: string,
  levelOfAssurance: string,
  attributes?: Attributes
}

export enum Scenario {
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
  CANCELLATION = 'CANCELLATION',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  REQUEST_ERROR = 'REQUEST_ERROR'
}

export interface VerifiableAttribute<T> {
  value: T,
  verified: boolean
  from?: String
  to?: String
}

export interface Attributes {
  firstName?: VerifiableAttribute<String>,
  middleNames?: Array<VerifiableAttribute<String>>,
  surnames?: Array<VerifiableAttribute<String>>,
  dateOfBirth?: VerifiableAttribute<String>,
  gender?: String,
  addresses?: Array<VerifiableAttribute<Address>>
}

export interface Address {
  lines?: string[],
  postCode?: string,
  internationalPostCode?: string,
}
