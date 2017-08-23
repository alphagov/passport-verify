/**
 * Represents the JSON returned by all error responses from the verify-service-provider
 */
export interface ErrorMessage {
  code: number,
  message: string
}
