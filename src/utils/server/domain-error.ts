// What went wrong, in terms of the app rather than HTTP. The API and the pages each turn these into the right answer
export type DomainErrorKind = 'forbidden' | 'invalid' | 'not-found' | 'unauthorized'

export const domainErrorStatus = {
  forbidden: 403,
  invalid: 422,
  'not-found': 404,
  unauthorized: 401,
} as const satisfies Record<DomainErrorKind, number>

const defaultMessages: Record<DomainErrorKind, string> = {
  forbidden: 'Forbidden',
  invalid: 'Invalid request',
  'not-found': 'Not found',
  unauthorized: 'Unauthorized',
}

export class DomainError extends Error {
  readonly kind: DomainErrorKind

  constructor(kind: DomainErrorKind, message = defaultMessages[kind]) {
    super(message)
    this.kind = kind
    this.name = 'DomainError'
  }

  get status() {
    return domainErrorStatus[this.kind]
  }
}
