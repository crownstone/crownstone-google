import { Headers } from 'actions-on-google';

/**
 * Retrieve "Bearer XXX" from Authorization header. Add it to the event as accessToken to access
 * the Crownstone servers.
 */
export const getAccessToken = (headers: Headers) => {
  const authHeader = (headers['authorization'] || headers['Authorization']) as string | undefined;

  if (!authHeader) {
    throw new Error('authorization header not provided');
  }

  const header = authHeader.split(' ');

  if (header[0] !== 'Bearer') {
    throw new Error('Incorrect header, expected bearer authentication');
  }

  return header.pop() as string;
};
