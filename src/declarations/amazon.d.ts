type DirectiveHeader = {
  namespace: string;
  name: string;
  payloadVersion: string;
  messageId: string;
};

type Scope = {
  type: string;
  token: string;
};

type DirectivePayload = {
  scope: Scope;
};

type Mappable<T = any> = {
  [key: string]: T;
};
type Directive = {
  header: DirectiveHeader;
  payload: DirectivePayload;
  endpoint: Endpoint;
};

type Endpoint = {
  scope: Scope;
  endpointId: string;
  cookie: Mappable<string>;
};

interface AmazonSmartHomeSkillEvent {
  directive: Directive;
}

type IntentSlot = { name: string; value: any };

interface AmazonCustomSkillEvent {
  session: {
    new: boolean;
    sessionId: string;
    application: {
      applicationId: string;
    };
    user: {
      userId: string;
      accessToken: string;
    };
  };
  request: {
    type: 'IntentRequest';
    requestId: string;
    timestamp: string;
    locale: string;
    intent: {
      name: string;
      slots: Mappable<IntentSlot>;
    };
  };
}
