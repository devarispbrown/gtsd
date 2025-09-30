import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { env } from './env';

const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: env.APP_VERSION,
  })
);

const traceExporter = new OTLPTraceExporter({
  url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
});

const provider = new NodeTracerProvider({
  resource,
});

provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
provider.register();

registerInstrumentations({
  instrumentations: [getNodeAutoInstrumentations()],
});

export const initTracing = async () => {
  try {
    console.log('✅ OpenTelemetry tracing initialized');
  } catch (error) {
    console.error('❌ Error initializing OpenTelemetry:', error);
  }
};

export const shutdownTracing = async () => {
  try {
    await provider.shutdown();
    console.log('✅ OpenTelemetry tracing shut down');
  } catch (error) {
    console.error('❌ Error shutting down OpenTelemetry:', error);
  }
};