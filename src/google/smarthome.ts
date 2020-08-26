import { smarthome, SmartHomeV1SyncDevices, SmartHomeV1QueryResponse } from 'actions-on-google';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import flatten from 'lodash.flattendeep';
import {getAccessToken} from "../utils/getAccessToken";
import {CrownstoneCloud, CrownstoneWebhooks} from "crownstone-cloud";

const log = createLogger('google/smarthome');

export const smarthomeApp = smarthome({
  jwt: config.GOOGLE_SERVICE_KEY,
  debug: true,
});


async function registerUser(hooks : CrownstoneWebhooks, accessToken : string, userId: string) {
  let events = [
    "dataChange", "switchStateUpdate", "abilityChange"
  ];
  await hooks.createListener(userId, accessToken, events, config.SYNC_URL);
}

async function verifyUserSubscription(hooks : CrownstoneWebhooks, accessToken: string, userId: string) {
  let listenerActive = await hooks.isListenerActiveByToken(accessToken);
  if (listenerActive !== true) {
    // the user might have gotten a new token but the old one has not expired.
    if (await hooks.isListenerActiveByUserId(userId)) {
      // ensure cleanup
      await hooks.removeListenerByUserId(userId);
    }
    await registerUser(hooks, accessToken, userId);
  }
}

/**
 * This method is invoked when we receive a "Discovery" message from a Google Home smart action.
 * We are expected to respond back with a list of appliances that we have discovered for a given
 * customer.
 */
smarthomeApp.onSync(async (body, headers) => {
  const accessToken = typeof headers !== 'string' ? getAccessToken(headers) : headers;
  let cloud = new CrownstoneCloud()
  let hooks = new CrownstoneWebhooks()
  cloud.setAccessToken(accessToken);
  hooks.setApiKey(config.EVENT_SERVER_API_KEY);
  // REST.setAccessToken(accessToken);
  // WebhookAPI.setApiKey(config.EVENT_SERVER_API_KEY);
  // fetch the user and their crownstones
  const userId = await cloud.me().id()
  console.log('userid', userId)
  const stones = await cloud.crownstones().data()
  console.log('stones', stones)
  // add the user to the even server
  await verifyUserSubscription(hooks, accessToken, userId);

  log.info(`stones: ${JSON.stringify(stones)}`);
  log.info(`userId: ${userId}}`);
  const devices: SmartHomeV1SyncDevices[] = [];

  stones.forEach((stone) => {
    let deviceType = 'action.devices.types.OUTLET';
    const traits = ['action.devices.traits.OnOff'];

    // if this crownstone has dimming enable add the brightness trait
    const canDim         = stone?.abilities?.find((v) => v.type === 'dimming');
    const canTapToToggle = stone?.abilities?.find((v) => v.type === 'tapToToggle');
    const canSwitchcraft = stone?.abilities?.find((v) => v.type === 'switchcraft');

    if (canDim && canDim.enabled) {
      traits.push('action.devices.traits.Brightness');
      // if this stone supports dimming, we know that this is a light
      deviceType = 'action.devices.types.LIGHT';
    }

    devices.push({
      id: stone.id,
      type: deviceType,
      traits,
      name: {
        defaultNames: [stone.name],
        name: stone.name,
        nicknames: [stone.name],
      },
      willReportState: true,
      attributes: {
        commandOnlyOnOff: true,
      },
      deviceInfo: {
        manufacturer: 'Crownstone',
        model: stone.type,
        hwVersion: stone.hardwareVersion,
        swVersion: stone.firmwareVersion,
      },
      // we can use this property to append custom data for a crownstone
      // we can check if dimming is enabled in Query intent, so we can also send the brightness to google
      customData: {
        dimmingEnabled: canDim?.enabled || false,
        tapToToggle: canTapToToggle?.enabled || false,
        switchCraft: canSwitchcraft?.enabled || false,
      } as CustomData,
    });
  });

  const res = {
    requestId: body.requestId,
    payload: {
      agentUserId: userId,
      devices,
    },
  };

  log.info(`Response on Sync ${JSON.stringify(res)}`);
  return res;
});

/**
 * This method is invoked when we receive a "EXECUTE" message from Google Home smart action.
 * We are expected to execute the intent received and tell google to resync state
 */
smarthomeApp.onExecute(async (body, headers) => {
  const accessToken = typeof headers !== 'string' ? getAccessToken(headers) : headers;
  let cloud = new CrownstoneCloud()
  let hooks = new CrownstoneWebhooks()

  cloud.setAccessToken(accessToken);
  hooks.setApiKey(config.EVENT_SERVER_API_KEY);

  const userId = await cloud.me().id();
  await verifyUserSubscription(hooks, accessToken, userId);


  const inputs = body.inputs;
  const stones = flatten(inputs.map((v) => v.payload).map((v) => flatten(v.commands.map((x) => x.devices))));
  const executions = flatten(inputs.map((v) => v.payload).map((v) => flatten(v.commands.map((x) => x.execution))));

  let onState = false;
  let onBrightness = 0;

  log.info(`command ${JSON.stringify(executions)}`);
  for (const execution of executions) {
    switch (execution.command) {
      case 'action.devices.commands.OnOff':
        for (const stone of stones) {
          try {
            // get current switch state from corwnstone
            let crownstone = cloud.crownstoneById(stone.id);

            const data = await crownstone.currentSwitchState()
            onState = execution.params.on;
            onBrightness = data;

            // send switch state to the crownstone
            await crownstone.setSwitch(execution.params.on ? 1 : 0);

            // create new state for the crownstone
            const newState = {
              agentUserId: userId,
              requestId: body.requestId,
              payload: {
                devices: {
                  states: {
                    [stone.id]: {
                      on: onState,
                      brightness: onBrightness,
                      online: true,
                    },
                  },
                },
              },
            };
            log.info(`new state ${JSON.stringify(newState)}`);
            // reporting the new state of a device is required by Google.
            await smarthomeApp.reportState(newState);
          }
          catch(e) {
            // Crownstone deleted?
            log.info("WARNING: error during switch request", e);
          }
        }
        break;
      case 'action.devices.commands.BrightnessAbsolute':
        for (const stone of stones) {
          // if dimming is not enabled for this crownstone skip this loop iteration
          if (!(stone.customData as CustomData).dimmingEnabled) continue;
          let crownstone = cloud.crownstoneById(stone.id);

          onBrightness = execution.params.brightness;
          onState = onBrightness > 0;
          await crownstone.setSwitch(onBrightness / 100);
          const newState = {
            agentUserId: userId,
            requestId: body.requestId,
            payload: {
              devices: {
                states: {
                  [stone.id]: {
                    on: onState,
                    brightness: onBrightness,
                    online: true,
                  },
                },
              },
            },
          };
          log.info(`new state ${JSON.stringify(newState)}`);
          // reporting the new state of a device is required by Google.
          await smarthomeApp.reportState(newState);
        }
        break;
    }
  }

  const command = {
    ids: stones.map((v) => v.id),
    status: 'SUCCESS' as 'SUCCESS',
    states: {
      on: onState,
      brightness: onBrightness,
      online: true,
    },
  };

  const res = {
    requestId: body.requestId,
    payload: {
      commands: [command],
    },
  };

  log.info(`Response on Execute ${JSON.stringify(res)}`);
  return res;
});

/**
 * This method is invoked when we receive a "QUERY" message from Google Gome smart action.
 * We are expected to return a list of appliances and the appliance status
 */
smarthomeApp.onQuery(async (body, headers) => {
  const accessToken = typeof headers !== 'string' ? getAccessToken(headers) : headers;
  let cloud = new CrownstoneCloud()
  cloud.setAccessToken(accessToken);

  const queryResult: SmartHomeV1QueryResponse = {
    requestId: body.requestId,
    payload: {
      devices: {},
    },
  };

  const devices = flatten(body.inputs.map((v) => v.payload.devices));

  const ids = devices.map((v) => ({ id: v.id, customData: v.customData as CustomData }));

  // get the status for each crownstone
  const promises = ids.map((deviceItem) => {
    let crownstone = cloud.crownstoneById(deviceItem.id);
    return crownstone.currentSwitchState()
      .then((switchState) => {
        const state = {
          on: switchState !== 0,
          ...(deviceItem.customData.dimmingEnabled ? {brightness: switchState * 100} : {}),
        };
        queryResult.payload.devices[deviceItem.id] = state;
      })
      .catch((e) => {
        log.info("WARNING: error during switch request", e);
      })
  });

  await Promise.all(promises);

  log.info(`Response on Query ${JSON.stringify(queryResult)}`);
  return queryResult;
});

/**
 * This method is invoked when we receive a "DISCONNECT" message from Google Gome smart action.
 * We are expected to stop reporting the crownstone state of this users devices to Google.
 */
smarthomeApp.onDisconnect(async (body, headers) => {
  const accessToken = typeof headers !== 'string' ? getAccessToken(headers) : headers;
  let cloud = new CrownstoneCloud()
  let hooks = new CrownstoneWebhooks()
  cloud.setAccessToken(accessToken);
  hooks.setApiKey(config.EVENT_SERVER_API_KEY);

  const userId = await cloud.me().id()
  await hooks.removeListenerByUserId(userId);
});
