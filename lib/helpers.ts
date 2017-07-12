export interface Scenarios {
  onMatch: (user: any) => any,
  onCreateUser: (user: any) => any,
  onAuthnFailed: (failure: any) => any,
  onError: (error: any) => any,
}

export function createResponseHandler (scenarios: Scenarios): any {
  return function (error: Error, user: any, infoOrError: any, status: number) {
    if (error) {
      return scenarios.onError(error)
    }
    if (user) {
      if (user._isNewUser) {
        return scenarios.onCreateUser(user)
      }
      return scenarios.onMatch(user)
    }
    return scenarios.onAuthnFailed(infoOrError)
  }
}
