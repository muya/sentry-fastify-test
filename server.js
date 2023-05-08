const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "",
  instrumenter: "otel",
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  debug: true
});

const {
  SentrySpanProcessor,
  SentryPropagator
} = require("@sentry/opentelemetry-node");

const { node } = require("@opentelemetry/sdk-node");
const {
  FastifyInstrumentation
} = require("@opentelemetry/instrumentation-fastify");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");

const { NodeTracerProvider } = node;

const opentelemetry = require("@opentelemetry/api");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const {
  getNodeAutoInstrumentations
} = require("@opentelemetry/auto-instrumentations-node");

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SentrySpanProcessor());
provider.register();
registerInstrumentations({
  instrumentations: getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": {
      enabled: false
    }
  })
});
opentelemetry.propagation.setGlobalPropagator(new SentryPropagator());

provider.register();

registerInstrumentations({
  instrumentations: [
    // Fastify instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation(),
    new FastifyInstrumentation()
  ]
});

const axios = require("axios");

const fastify = require("fastify")({
  logger: true
});

// Declare a route
fastify.get("/", (request, reply) => {
  reply.send({ hello: "world" });
});

fastify.get("/api", async (request, reply) => {
  const res = await axios.get("https://catfact.ninja/fact");
  reply.send(res.data);
});

// Run the server!
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
