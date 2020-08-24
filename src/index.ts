import 'source-map-support/register';
import { APIGatewayEvent } from 'aws-lambda';
import { googleSmartHome } from './google';
import {config} from "./utils/config";
import {handleSseInvocation} from "./google/SseEventHandler";

// /**
//  * Check if this is a SmartHome skill evebt
//  * @param event
//  */
// const isSmartHomeEvent = (event: Mappable): event is AmazonSmartHomeSkillEvent => {
//   return event && event.directive && event.directive.header;
// };
//
// /**
//  * Check if this a custom skill event
//  * @param event
//  */
// const isCustomSkillEvent = (event: Mappable): event is AmazonCustomSkillEvent => {
//   return event.request && event.request.intent && event.request.intent.name;
// };

/**
 * Check if this is an Api Gateway event
 * @param event
 */
const isApiGateWayEvent = (event: Mappable): event is APIGatewayEvent => {
  return event.httpMethod && event.requestContext && event.requestContext.requestId;
};

/**
 * Entrypoint for AWS Lambda
 * Set the function name as the handler in the Lambda configuration
 * @param event
 * @param context
 */
export const handler = async function ( event: APIGatewayEvent, context: any ) {

  // Unlike the Alexa smart home and custom event, Api gateway sends a different type of event.
  // With this we can determine if this request is sent by Google, by checking the url path.
  if (isApiGateWayEvent(event) && ['/smarthome', '/dialogflow'].includes(event.path)) {
    return await googleSmartHome(event, context);
  }
  else if (isApiGateWayEvent(event) && ['/google-sync'].includes(event.path)) {
    const body : SseCall = JSON.parse(event.body || '{}');
    if (body.clientSecret === config.SSE_EVENT_USER_SECRET) {
      return await handleSseInvocation(body.userId, body.data);
    }
  }


  return {
    statusCode: 404,
    headers: {},
    body: { message: 'Event not found' },
  };
};
