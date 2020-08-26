import { smarthome, SmartHomeV1ReportStateRequest } from 'actions-on-google';
import {smarthomeApp} from "./smarthome";


export async function handleSseInvocation(userId : string, sseEvent: SseDataEvent) {
  // for now we only handle the update event
  if (canTriggerReportState(sseEvent)) {
    console.log(`reporting new state for user ${userId} and device ${sseEvent.crownstone.id}`);
    try {
      await reportState(userId, sseEvent);
    } catch (error) {
      console.log(error);
    }
  } else if (canTriggerRequestSync(sseEvent)) {
    console.log(`requesting new sync request for user ${userId}`);
    try {
      await requestSync(userId);
    } catch (error) {
      console.log(error);
    }
  }
}

export const reportState = (userId: string, event: SwitchStateUpdateEvent) => {
  const stone = event.crownstone;
  const newState: SmartHomeV1ReportStateRequest = {
    agentUserId: userId,
    requestId: Math.random().toString(),
    payload: {
      devices: {
        states: {
          [stone.id]: {
            on: stone.switchState > 0,
            brightness: stone.switchState * 100,
            online: true,
          },
        },
      },
    },
  };
  return smarthomeApp.reportState(newState);
};

export const requestSync = (userId: string) => {
  return smarthomeApp.requestSync(userId);
};

const canTriggerReportState = (event: SseEvent): event is SwitchStateUpdateEvent =>
  event.type === 'switchStateUpdate' && event.subType === 'stone';

const canTriggerRequestSync = (event: SseEvent): event is DataChangeEvent | AbilityChangeEvent =>
  (event.type === 'dataChange' && event.subType === 'stones' && (event.operation === 'create' || event.operation === 'delete')) ||
  (event.type === 'abilityChange' && event.subType === 'dimming');