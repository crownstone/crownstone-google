export const createLogger = (context: string) => ({
  info: (msg: string, obj?: {}): void => {
    let message = `${context} -> ${msg}`;

    if (typeof obj === 'object') {
      message = `${message}: ${JSON.stringify(obj)}`;
    }

    console.log(message);
  },
  error: (error: Error): void => {
    const message = `${context} -> ${error.message}`;
    console.error(message);
  },
});
