/**
 * Next.js Instrumentation
 * Registers OpenTelemetry tracing with Langfuse exporter
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  // Only register in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    registerOTel({
      serviceName: "not-figma-ai-assistant",
      traceExporter: new LangfuseExporter({
        // Credentials from environment variables (LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASEURL)
        // No need to pass them explicitly if env vars are set
        debug: false, // Disable debug logs to reduce console noise
      }),
    });
  }
}
