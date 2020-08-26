import { createLogger } from '../utils/logger';
import * as smarthome from './smarthome';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { StandardResponse } from 'actions-on-google';

const log = createLogger('google');

// handle all google smarthome actions here
export const googleSmartHome = async (event: APIGatewayEvent, ctx: Context) => {
  log.info(`Incoming request from Google: ${JSON.stringify({ event, ctx })}`);
  let payload: StandardResponse | null;

  if (event.path.includes('smarthome')) {
    const body = JSON.parse(event.body || '{}');
    payload = await smarthome.smarthomeApp.handler(body, event.headers)
  }
  else {
    log.error(new Error(`No handler found for path ${event.path}`));
    payload = { status: 404, headers: {}, body: { message: 'No handler found for Google' } };
  }

  const res = {
    statusCode: payload.status,
    headers: payload.headers,
    body: JSON.stringify(payload.body),
  };

  console.log(`Response Google: ${JSON.stringify(res)}`);
  return res;
};
