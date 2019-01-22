export interface V2TranslatedResponseBody {
  scenario: V2Scenario,
  pid: string,
  levelOfAssurance: string,
  attributes?: V2Attributes
}

export enum V2Scenario {
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
  CANCELLATION = 'CANCELLATION',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  REQUEST_ERROR = 'REQUEST_ERROR'
}

export interface V2VerifiableAttribute<T> {
  value: T,
  verified: boolean
  from?: String
  to?: String
}

export interface V2Attributes {
  firstName?: V2VerifiableAttribute<String>,
  middleNames?: V2VerifiableAttribute<String>[],
  surnames?: V2VerifiableAttribute<String>[],
  dateOfBirth?: V2VerifiableAttribute<String>,
  gender?: String,
  addresses?: V2VerifiableAttribute<V2Address>[]
}

export interface V2Address {
  lines?: string[],
  postCode?: string,
  internationalPostCode?: string,
}
