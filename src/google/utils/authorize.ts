import { LocaleService } from './../../helpers/LocationService';
import {
  SignIn,
  DialogflowConversation,
  Parameters,
  Contexts,
  Argument,
  GoogleCloudDialogflowV2WebhookRequest,
} from 'actions-on-google';
import { createLogger } from '../../utils/logger';
import {CrownstoneCloud} from "crownstone-cloud";

const log = createLogger('google/util/authorize');

type DialogFlowConv = DialogflowConversation<any, any, Contexts>;

type Conversation = DialogFlowConv & { cloud: CrownstoneCloud, i18n: LocaleService };

/**
 * Check if the user is authorize to call this intent
 * This function also attaches the api and i18n in to the conv object
 * @param cb
 */
export function authorize(callback: (conv: Conversation, params: Parameters, args: Argument) => Promise<any> | any) : ((conversation: DialogFlowConv, params: Parameters, args: Argument) => void) {
  return async (conversation, params, args) => {
    log.info(`Calling ${conversation.intent} with params ${JSON.stringify(params)}`);

    if (!conversation.user.access.token) {
      log.info('User not authenticad');
      return conversation.ask(new SignIn('To start using crownstone dialog signin'));
    }

    log.info('User authenticated');

    const newConversation = conversation as Conversation;
    newConversation.cloud = new CrownstoneCloud();
    newConversation.cloud.setAccessToken(conversation.user.access.token);
    newConversation.i18n = new LocaleService();
    // set user language code
    const body = conversation.body as GoogleCloudDialogflowV2WebhookRequest;
    await newConversation.i18n.setLocale(body.queryResult?.languageCode);

    return await callback(newConversation, params, args);
  };
};
