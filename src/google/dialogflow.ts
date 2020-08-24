import { authorize } from './utils/authorize';
import { createLogger } from '../utils/logger';
import { dialogflow, SignIn } from 'actions-on-google';

const log = createLogger('google/dialogflow');

const app = dialogflow({
  debug: true,
});

app.intent('actions.intent.MAIN', (conv) => {
  conv.ask(new SignIn('To start using crownstone dialog signin'));
});

/**
 * This intent will be activayed when the users asks "Hey Google, Talk to <invocation name>"
 */
app.intent(
  'Default Welcome Intent',
  authorize((conv) => {
    log.info(`user ${JSON.stringify(conv.user.access.token)}`);
    conv.ask(conv.i18n.t('WELCOME'));
  }),
);

/**
 * This intent is executed when the user asks "IS there anyone home?"
 */
// app.intent(
//   'retro.anyone-home',
//   authorize(async (conv) => {
//     const user = await conv.cloud.me().data();
//     const userLocation = await conv.api.getUserCurrentLocation(user);
//
//     const sphere = userLocation?.[0].inSpheres?.[0].sphereId;
//
//     if (!sphere) {
//       return conv.close(conv.i18n.t('NOT_IN_SPHERE'));
//     }
//
//     const peopleInSphere = await conv.api.getPresentPeopleInSphere(sphere);
//     const peopleCount = peopleInSphere.length;
//
//     if (peopleCount > 1) {
//       return conv.close(conv.i18n.t('NO_ONE_HOME'));
//     }
//
//     // i81n support, singular and plural support
//     conv.close(conv.i18n.t('ANYONE_IS_HOME', { count: peopleCount }));
//   }),
// );
//
// /**
//  * This intent is executed when the user asks "Is X home?"
//  */
// app.intent(
//   'retro.is-person-home',
//   authorize(async (conv) => {
//     const user = await conv.api.getUser();
//     const userLocation = await conv.api.getUserCurrentLocation(user);
//
//     const sphere = userLocation?.[0].inSpheres?.[0].sphereId;
//
//     if (!sphere) {
//       return conv.close(conv.i18n.t('NOT_IN_SPHERE'));
//     }
//
//     const presentPeopleInSphere = await conv.api.getPresentPeopleInSphere(sphere);
//     const usersInSphere = await conv.api.getUsersInSphere(sphere);
//
//     const users = [...usersInSphere.admins, ...usersInSphere.members, ...usersInSphere.guests];
//
//     log.info(`users of sphere ${JSON.stringify(usersInSphere)}`);
//     log.info(`present people in sphere ${JSON.stringify(presentPeopleInSphere)}`);
//
//     const name = conv.parameters.givenName as string;
//
//     const personExists = users.find((v) => v.firstName.toLowerCase() === name.toLowerCase());
//
//     if (personExists) {
//       return conv.close(conv.i18n.t('PERSON_IS_HOME', { name: personExists.firstName }));
//     }
//
//     conv.close(conv.i18n.t('PERSON_NOT_HOME', { name }));
//   }),
// );

/**
 * This intent is not implemented yet, and is disabled in the Dialogflow-console
 */
app.intent(
  'retro.why-device-state',
  authorize(() => {}),
);

/**
 * This intent is not not implemented yet, and is disabled in the Dialogflow-console
 */
app.intent(
  'retro.why-device-active',
  authorize(() => {}),
);

export const dialogflowApp = app;
