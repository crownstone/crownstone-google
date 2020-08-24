import { createLogger } from './logger';
import { SmartHomeJwt } from 'actions-on-google';

const log = createLogger('config');

let jwt: SmartHomeJwt | undefined;

try {
  // Hardcoded string
  jwt = require('../../private/google_service_key.json');
} catch (error) {
  log.error(new Error('Error requiring google service key'));
}

export const config = {
  GOOGLE_SERVICE_KEY: jwt as SmartHomeJwt,

  EVENT_SERVER_URL:      process.env.EVENT_SERVER_URL,
  SSE_EVENT_USER_SECRET: process.env.SSE_EVENT_USER_SECRET,
  EVENT_SERVER_API_KEY:  process.env.EVENT_SERVER_API_KEY,

  SYNC_URL: process.env.SYNC_URL
};
