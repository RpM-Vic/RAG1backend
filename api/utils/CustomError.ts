
export class CustomError extends Error {
  constructor(
    message: string,// not user friendly
    public functionName: string,
    public data?: any
  ) {
    super(message);
    this.name = 'FunctionError';
  }
}