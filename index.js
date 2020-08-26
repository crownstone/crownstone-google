let main = require("./dist/index")

/**
 * Main entry point.
 * Incoming events from Alexa Lighting APIs are processed via this method.
 */
exports.handler = function(event, context) {
  main.handler(event, context)
    .then((reply) => {
      if (!reply) {
        reply = {};
      }
      let headers = reply.headers || {};
      let body = reply.body || '';
      if (typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
      }
      body = typeof body === "object" ? JSON.stringify(body) : body

      context.succeed({
        isBase64Encoded: false,
        statusCode: reply.statusCode || 204,
        headers: headers,
        body: body,
      });
    })
    .catch((e) => {
      let result = e;
      if (!result) {
        result = {};
      }
      let headers = result.headers || {};
      let body = result.body || e;
      if (typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
      }

      context.fail({
        isBase64Encoded: false,
        statusCode: result.statusCode || 400,
        headers: headers,
        body: typeof body === "object" ? JSON.stringify(body) : body
      })
    })
}