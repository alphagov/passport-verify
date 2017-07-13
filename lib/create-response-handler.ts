import { TranslatedResponseBody } from './passport-verify-strategy'

export interface Scenarios {
  onMatch: (user: any) => any,
  onCreateUser: (user: any) => any,
  onAuthnFailed: (failure: string) => any,
  onError: (error: Error) => any,
}

export function createResponseHandler (scenarios: Scenarios) {
  return function (error: Error, user: any, infoOrError: TranslatedResponseBody|string, status: number) {
    if (error) {
      return scenarios.onError(error)
    }
    if (user) {
      if ((infoOrError as TranslatedResponseBody).attributes) {
        return scenarios.onCreateUser(user)
      }
      return scenarios.onMatch(user)
    }
    return scenarios.onAuthnFailed(infoOrError as string)
  }
}
