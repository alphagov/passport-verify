/**
 * Represents the JSON returned by a success response from the
 * `/generate-request` endpoint in the verify-service-provider
 */
export interface AuthnRequestResponse {
  samlRequest: string,
  requestId: string,
  ssoLocation: string
}
