// Minimal ambient typings for @jsonresume/schema — it ships no .d.ts of its own.

declare module '@jsonresume/schema' {
  interface SchemaValidationError {
    /** Path segments to the offending value, e.g. ['basics', 'email']. */
    path?: (string | number)[]
    message: string
  }

  interface JsonResumeSchemaModule {
    schema: Record<string, unknown>
    validate: (resumeJson: unknown, callback: (errors: SchemaValidationError[] | null, valid: boolean) => void) => void
  }

  const jsonResumeSchema: JsonResumeSchemaModule
  export default jsonResumeSchema
}
