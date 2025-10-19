# Langfuse Observability Integration

**Date:** 2025-10-19
**Status:** Planning & Implementation Guide
**Purpose:** Add comprehensive observability/monitoring to AI features using Langfuse + Vercel AI SDK

---

## Overview

This document provides a step-by-step guide to integrate Langfuse observability into the not-figma project's AI features. Langfuse will track multi-step tool executions, token usage, performance metrics, and provide debugging capabilities for the agentic AI assistant.

### What is Langfuse?

Langfuse is an open-source LLM observability platform that provides:
- Detailed tracing of AI SDK calls and tool executions
- Token usage and cost tracking per request
- Performance metrics (latency, time-to-first-token)
- Debug UI for analyzing multi-step tool chains
- Session tracking and user analytics

### Why Add Langfuse Now?

The project recently implemented multi-step agentic tool execution using Vercel AI SDK with `stopWhen: stepCountIs(10)`. This enables the AI to chain multiple tools together to complete complex tasks. Langfuse will provide visibility into:
- How many steps each request takes
- Which tools are being called and in what order
- Token consumption per step and per request
- Bottlenecks and failures in the tool chain
- Cost per user interaction

---

## Prerequisites

### 1. Langfuse Account Setup

**Step 1: Create a Langfuse Account**

Choose one of the following options:

**Option A: Langfuse Cloud (Recommended for Getting Started)**
1. Go to [https://cloud.langfuse.com](https://cloud.langfuse.com) (EU) or [https://us.cloud.langfuse.com](https://us.cloud.langfuse.com) (US)
2. Sign up for a free Hobby account (no credit card required)
3. Create a new project for "not-figma"

**Option B: Self-Hosted (For Full Control)**
1. Follow the [self-hosting guide](https://langfuse.com/docs/deployment/self-host)
2. Deploy using Docker Compose or a cloud provider
3. Set up your custom domain

**Step 2: Get API Credentials**
1. In the Langfuse dashboard, go to "Settings" → "API Keys"
2. Click "Create new API key"
3. Copy the following values:
   - **Public Key** (starts with `pk-lf-...`)
   - **Secret Key** (starts with `sk-lf-...`)
   - **Base URL** (e.g., `https://cloud.langfuse.com` or `https://us.cloud.langfuse.com`)

**Step 3: Set Environment Property (Optional)**
- You can set an "environment" label (e.g., `production`, `staging`, `development`) to separate traces
- This is configured in the instrumentation setup (see implementation section)

### 2. Free Tier Limits

**Langfuse Hobby Plan (Free):**
- 50,000 observations/month (an "observation" = one trace span, e.g., one AI call or tool execution)
- 90 days data retention
- All core features included
- No credit card required

**Estimating Usage:**
- Simple command (1 tool call): ~2-3 observations (generation + tool + result)
- Multi-step command (3 tools): ~6-10 observations
- With 50k observations/month, you can handle ~5,000-10,000 AI commands/month on the free tier

**Upgrading:**
- **Pro Plan**: $59/month for 100k observations + unlimited data retention
- **Self-hosting**: Free and unlimited if you host it yourself

---

## Implementation Plan

### Phase 1: Install Dependencies

**Required npm packages:**

```bash
npm install @vercel/otel langfuse-vercel @opentelemetry/api-logs @opentelemetry/instrumentation @opentelemetry/sdk-logs
```

**Package versions to use:**
- `@vercel/otel`: Latest (handles OpenTelemetry registration)
- `langfuse-vercel`: Latest (Langfuse exporter for Vercel/Next.js)
- `ai`: Ensure you're on `^3.3.0` or higher (already at `^5.0.76` in package.json ✓)

**Alternative approach (for AI SDK v5+):**

If you encounter issues with `@vercel/otel` (it doesn't yet support OpenTelemetry JS SDK v2), use manual setup:

```bash
npm install @langfuse/otel @opentelemetry/sdk-trace-node @opentelemetry/api
```

### Phase 2: Environment Variables

Add the following to `.env.local`:

```bash
# Langfuse Observability Configuration
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here
LANGFUSE_BASEURL=https://cloud.langfuse.com  # or https://us.cloud.langfuse.com
```

**Also update `.env.template`** to document these for other developers:

```bash
# Langfuse Observability (Optional - for AI monitoring/debugging)
# Sign up at https://cloud.langfuse.com to get your API keys
# Free tier: 50k observations/month, 90 days retention
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASEURL=https://cloud.langfuse.com
```

**For Vercel deployment:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all three Langfuse variables
4. Redeploy your app

### Phase 3: Create Instrumentation File

Next.js 15 supports automatic instrumentation via the `instrumentation.ts` file at the root of your project.

**Create file:** `/Users/Gauntlet/gauntlet/not-figma/instrumentation.ts`

```typescript
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
        debug: process.env.NODE_ENV === "development", // Enable debug logs in development
      }),
    });

    console.log("[Langfuse] OpenTelemetry instrumentation registered");
  }
}
```

**Alternative approach (if @vercel/otel has issues):**

```typescript
/**
 * Next.js Instrumentation (Manual OpenTelemetry Setup)
 * For AI SDK v5+ with OpenTelemetry JS SDK v2
 */

import { LangfuseSpanProcessor, ShouldExportSpan } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Optional: Filter out Next.js infrastructure spans to reduce noise
    const shouldExportSpan: ShouldExportSpan = (span) => {
      return span.otelSpan.instrumentationScope.name !== "next.js";
    };

    const langfuseSpanProcessor = new LangfuseSpanProcessor({
      shouldExportSpan,
      // Environment label for separating traces (optional)
      // metadata: {
      //   environment: process.env.NODE_ENV || "development",
      // },
    });

    const tracerProvider = new NodeTracerProvider({
      spanProcessors: [langfuseSpanProcessor],
    });

    tracerProvider.register();

    console.log("[Langfuse] Manual OpenTelemetry instrumentation registered");
  }
}
```

### Phase 4: Enable Telemetry in AI Route

**Modify file:** `/Users/Gauntlet/gauntlet/not-figma/app/api/ai/chat/route.ts`

**Current code (lines 312-323):**

```typescript
const apiPromise = generateText({
  model: openai("gpt-4.1-mini"),
  messages,
  tools: aiTools,
  stopWhen: stepCountIs(10),
  experimental_context: {
    userId,
    canvasId,
    selectedIds,
    sessionId,
  },
});
```

**Updated code with telemetry:**

```typescript
const apiPromise = generateText({
  model: openai("gpt-4.1-mini"),
  messages,
  tools: aiTools,
  stopWhen: stepCountIs(10),
  experimental_context: {
    userId,
    canvasId,
    selectedIds,
    sessionId,
  },
  // Enable Langfuse observability
  experimental_telemetry: {
    isEnabled: true,
    functionId: "ai-chat-canvas", // Identifier for this AI function
    metadata: {
      // Additional metadata to track in Langfuse
      userId,
      canvasId,
      sessionId: sessionId || "no-session",
      selectedObjectsCount: selectedIds.length,
      environment: process.env.NODE_ENV || "development",
    },
  },
});
```

**Why these metadata fields?**
- `userId`: Track which users are using AI features most
- `canvasId`: See which canvases have the most AI activity
- `sessionId`: Group related commands in a conversation
- `selectedObjectsCount`: Understand how selection affects AI behavior
- `environment`: Separate dev/staging/production traces

### Phase 5: Optional - Force Flush for Serverless

If deploying to Vercel or other serverless platforms, add this after the AI response to ensure traces are sent before the function terminates:

**Add to route.ts (after line 402, before returning response):**

```typescript
// 9. Extract tool results from response
const toolResults: AIToolResult[] = [];
// ... existing tool result extraction code ...

// Force flush traces in serverless environment (Vercel, AWS Lambda, etc.)
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    // Import the exporter instance
    const { langfuseSpanProcessor } = await import("@/instrumentation");
    await langfuseSpanProcessor?.forceFlush?.();
  } catch (error) {
    console.warn("[Langfuse] Failed to flush traces:", error);
  }
}

// 10. Return response
return NextResponse.json({
  message: aiResponse.text,
  toolResults,
  usage: {
    promptTokens: (aiResponse.usage as any).promptTokens || 0,
    completionTokens: (aiResponse.usage as any).completionTokens || 0,
    totalTokens: aiResponse.usage.totalTokens || 0,
  },
});
```

**Note:** For the simple `@vercel/otel` approach, force flushing is handled automatically. This is only needed for manual NodeTracerProvider setup.

---

## Configuration Options

### Metadata You Can Track

**In `experimental_telemetry.metadata`:**
- `userId`: User who made the request
- `canvasId`: Canvas being edited
- `sessionId`: Conversation session ID
- `environment`: dev/staging/production
- `userEmail`: User's email (if available)
- `commandType`: "create" | "update" | "query" (custom classification)
- `toolCount`: Number of tools called (calculated post-execution)
- Custom tags: `tags: ["experiment", "beta-feature"]`

**Example of rich metadata:**

```typescript
experimental_telemetry: {
  isEnabled: true,
  functionId: "ai-chat-canvas",
  metadata: {
    userId,
    canvasId,
    sessionId: sessionId || "no-session",
    selectedObjectsCount: selectedIds.length,
    environment: process.env.NODE_ENV || "development",
    messageLength: message.length,
    hasConversationHistory: conversationHistory.length > 0,
    version: "v1.0", // Track different AI prompt versions
    tags: ["multi-step-enabled"], // Custom categorization
  },
},
```

### Filtering Spans (Reduce Noise)

If you see too many Next.js infrastructure traces, use the `shouldExportSpan` filter:

```typescript
const shouldExportSpan: ShouldExportSpan = (span) => {
  const scope = span.otelSpan.instrumentationScope.name;

  // Only export AI SDK and custom application spans
  return (
    scope.includes("ai-sdk") ||
    scope.includes("openai") ||
    scope === "not-figma-ai-assistant"
  );
};
```

### Debug Mode

Enable debug logging during development:

```typescript
new LangfuseExporter({
  debug: process.env.NODE_ENV === "development",
})
```

This will log trace exports to the console, helpful for verifying setup.

---

## Testing the Integration

### Step 1: Start Development Server

```bash
npm run dev
```

Check console for:
```
[Langfuse] OpenTelemetry instrumentation registered
```

### Step 2: Make an AI Request

1. Open the app at `http://localhost:3000`
2. Create or open a canvas
3. Use the AI assistant (e.g., "create a red circle in the center")
4. Check browser console for successful AI response

### Step 3: Verify in Langfuse Dashboard

1. Go to your Langfuse dashboard ([https://cloud.langfuse.com](https://cloud.langfuse.com))
2. Navigate to "Traces" in the sidebar
3. You should see a new trace appear within 5-10 seconds

**What you'll see:**
- **Trace name**: "ai-chat-canvas" (your functionId)
- **Metadata**: userId, canvasId, sessionId, etc.
- **Spans**: Nested spans showing:
  - Main `generateText` call
  - Model inference (GPT-4)
  - Tool calls (createCircle, updateObject, etc.)
  - Tool results
- **Usage**: Token counts (prompt, completion, total)
- **Timing**: Duration of each step

### Step 4: Test Multi-Step Execution

Try a complex command that requires multiple tools:

```
"Create a red circle in the center, then create a blue rectangle above it, then connect them with a line"
```

In Langfuse, you should see:
- Multiple tool call spans (createCircle → createRectangle → createLine)
- Sequential execution visible in the waterfall view
- Total tokens across all steps

### Step 5: Verify Session Tracking

Make multiple AI requests in the same conversation (same sessionId):

1. "create a circle"
2. "make it bigger"
3. "change it to blue"

In Langfuse:
- Filter traces by `sessionId` in metadata
- All three commands should be linked to the same session
- Useful for analyzing conversation patterns

### Step 6: Test Error Tracking

Trigger an error (e.g., invalid command or locked object):

```
"update object xyz123 to be red" (where xyz123 doesn't exist)
```

Langfuse should capture:
- The failed tool call
- Error message in the trace
- Status marked as error

---

## Viewing & Analyzing Traces

### Langfuse Dashboard Overview

**Main Views:**

1. **Traces**: List of all AI requests
   - Search/filter by metadata (userId, canvasId, sessionId)
   - Sort by cost, latency, token count
   - Click to see detailed trace view

2. **Sessions**: Group traces by sessionId
   - See entire conversation chains
   - Analyze multi-turn interactions

3. **Metrics**: Aggregate statistics
   - Total requests, tokens, costs
   - Average latency
   - Error rates
   - Usage by user or canvas

4. **Playground**: Test and debug prompts
   - Replay requests with different prompts
   - Compare outputs
   - Optimize prompt versions

### Key Features to Explore

**1. Trace Detail View**
- Waterfall timeline showing each step
- Expand spans to see input/output
- View token counts per model call
- See tool call parameters and results

**2. Cost Tracking**
- Automatic cost calculation based on model pricing
- Cost per request, per user, per session
- Export cost reports

**3. Filtering & Search**
- Filter by metadata: `userId = "abc123"`
- Search by trace content
- Date range filters
- Status filters (success, error)

**4. Debugging Multi-Step Chains**
- See tool call sequence
- Identify bottlenecks (which step takes longest)
- Spot failed tool calls
- Analyze token usage per step

**5. User Analytics**
- Which users use AI most frequently?
- What types of commands are most common?
- Which canvases have the most AI activity?

---

## Cost Considerations

### Langfuse Pricing

**Free Tier (Hobby Plan):**
- Cost: $0/month
- Limit: 50,000 observations/month
- Retention: 90 days
- Features: All core features

**When to Upgrade:**
- You exceed 50k observations/month (~5k-10k AI commands)
- You need longer data retention (unlimited)
- You want priority support

**Paid Plans:**
- **Pro**: $59/month (100k observations, unlimited retention)
- **Team**: $499/month (unlimited, advanced security)
- **Self-Host**: Free (unlimited, you manage infrastructure)

### Observations Count Estimation

**What is an "observation"?**
- Each span in a trace = 1 observation
- A simple AI request generates ~2-5 observations:
  - 1 for the `generateText` call
  - 1-2 for model inference
  - 1 per tool call
  - 1 per tool result

**Example counts:**
- "Create a circle": ~3 observations (generation + createCircle + result)
- "Create circle, make it red": ~6 observations (2 tool calls)
- "Create 3 shapes and connect them": ~12 observations (4 tools: 3 creates + 1 line)

**Monthly budget:**
- 50k observations = ~5,000-10,000 AI commands (depending on complexity)
- Average command uses ~5-10 observations
- If you have 100 active users making 50 AI commands/month each: ~25k-50k observations

### OpenAI Costs (Separate)

Langfuse doesn't charge for AI inference - you still pay OpenAI directly.

**Current setup:**
- Model: `gpt-4.1-mini`
- Approximate cost: $0.001-0.005 per command
- With Langfuse, you can now track exact costs per request

**Langfuse cost tracking features:**
- Automatically calculates cost based on token usage
- Links to OpenAI pricing tables
- Shows cost per trace, per user, per session
- Export cost reports for budgeting

---

## Common Issues & Troubleshooting

### Issue 1: Traces Not Appearing in Langfuse

**Symptoms:**
- AI requests work fine
- No traces show up in Langfuse dashboard

**Debugging steps:**

1. **Check environment variables:**
   ```bash
   # In terminal
   echo $LANGFUSE_SECRET_KEY
   echo $LANGFUSE_PUBLIC_KEY
   echo $LANGFUSE_BASEURL
   ```
   Make sure they're set and correct.

2. **Enable debug mode:**
   ```typescript
   new LangfuseExporter({ debug: true })
   ```
   Look for export logs in server console.

3. **Check instrumentation registration:**
   Look for console log: `[Langfuse] OpenTelemetry instrumentation registered`

   If missing, verify:
   - `instrumentation.ts` is at project root (not in `app/` or `src/`)
   - Next.js version is 15+ (supports instrumentation)
   - Server restarted after adding instrumentation

4. **Verify telemetry is enabled:**
   Check that `experimental_telemetry.isEnabled = true` in your `generateText` call.

5. **Wait for export:**
   Traces may take 5-10 seconds to appear. Refresh the Langfuse dashboard.

6. **Check API key permissions:**
   Make sure the Langfuse API keys have write permissions (not read-only).

### Issue 2: Too Many Spans / Noise

**Symptoms:**
- Traces have dozens of Next.js internal spans
- Hard to find actual AI SDK spans

**Solution:**

Use `shouldExportSpan` filter:

```typescript
const shouldExportSpan: ShouldExportSpan = (span) => {
  const scope = span.otelSpan.instrumentationScope.name;
  return scope !== "next.js" && !scope.includes("http");
};
```

### Issue 3: Missing Tool Call Details

**Symptoms:**
- Traces show `generateText` but not individual tool calls
- No tool parameters visible

**Possible causes:**

1. **AI SDK version too old:**
   - Ensure `ai` package is `^3.3.0` or higher
   - Update: `npm install ai@latest`

2. **OpenTelemetry span details:**
   - Tool calls appear as child spans
   - Click to expand in trace waterfall view

### Issue 4: Serverless Timeout / Traces Lost

**Symptoms:**
- Traces appear locally but not in production (Vercel)
- Intermittent missing traces

**Solution:**

Add force flush before response:

```typescript
// Import at top
let langfuseSpanProcessor: any;

export function register() {
  langfuseSpanProcessor = new LangfuseSpanProcessor({...});
  // ... rest of setup
}

// In route handler
if (process.env.VERCEL) {
  await langfuseSpanProcessor?.forceFlush?.();
}
```

Or use the simpler `@vercel/otel` approach which handles this automatically.

### Issue 5: Environment Variable Not Found

**Symptoms:**
```
Error: LANGFUSE_SECRET_KEY is required
```

**Solutions:**

1. **Local development:**
   - Check `.env.local` exists and has the variables
   - Restart `npm run dev` after adding env vars

2. **Vercel deployment:**
   - Add variables in Vercel dashboard → Project Settings → Environment Variables
   - Redeploy after adding variables

3. **Optional fallback:**
   ```typescript
   new LangfuseExporter({
     secretKey: process.env.LANGFUSE_SECRET_KEY || "",
     publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
     baseUrl: process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com",
   })
   ```

---

## Advanced Usage

### 1. Session Tracking Across Page Loads

**Current implementation:**
- `sessionId` passed from client in request body
- Generated on client, persists in component state

**Enhancement opportunity:**
Store sessionId in localStorage to persist across page reloads:

```typescript
// In client component
const [sessionId] = useState(() => {
  const stored = localStorage.getItem("ai-session-id");
  if (stored) return stored;

  const newId = crypto.randomUUID();
  localStorage.setItem("ai-session-id", newId);
  return newId;
});
```

This enables tracking entire user journeys in Langfuse Sessions view.

### 2. Custom Trace IDs

Link traces to application-specific IDs (e.g., canvasId + timestamp):

```typescript
experimental_telemetry: {
  isEnabled: true,
  functionId: "ai-chat-canvas",
  metadata: {
    traceId: `${canvasId}-${Date.now()}`, // Custom trace identifier
    // ... other metadata
  },
}
```

### 3. A/B Testing Prompts

Track different prompt versions:

```typescript
const promptVersion = Math.random() > 0.5 ? "v1" : "v2";

const systemPrompt = promptVersion === "v1"
  ? systemPromptV1
  : systemPromptV2;

experimental_telemetry: {
  metadata: {
    promptVersion,
  },
}
```

Then in Langfuse:
- Filter by `promptVersion`
- Compare success rates, token usage, latency
- Determine which prompt performs better

### 4. Error Analysis

Track custom error types:

```typescript
catch (error) {
  // ... existing error handling ...

  // Optional: Send error event to Langfuse
  await langfuseSpanProcessor?.addEvent?.({
    name: "ai_error",
    attributes: {
      errorType: error.name,
      errorMessage: error.message,
      userId,
      canvasId,
    },
  });
}
```

### 5. Performance Monitoring

Set up alerts for slow requests:

In Langfuse dashboard:
1. Go to "Metrics" → "Create Alert"
2. Condition: "Latency > 5 seconds"
3. Notification: Email/Slack webhook
4. Filter: `environment = production`

---

## Next Steps

### Immediate Actions

1. **Set up Langfuse account** (5 minutes)
   - Sign up at cloud.langfuse.com
   - Create project
   - Copy API keys

2. **Install dependencies** (1 minute)
   ```bash
   npm install @vercel/otel langfuse-vercel @opentelemetry/api-logs @opentelemetry/instrumentation @opentelemetry/sdk-logs
   ```

3. **Add environment variables** (2 minutes)
   - Update `.env.local`
   - Update `.env.template`

4. **Create `instrumentation.ts`** (5 minutes)
   - Copy code from "Phase 3" above
   - Place at project root

5. **Enable telemetry in route** (3 minutes)
   - Update `app/api/ai/chat/route.ts`
   - Add `experimental_telemetry` configuration

6. **Test locally** (5 minutes)
   - Restart dev server
   - Make AI request
   - Check Langfuse dashboard

7. **Deploy to Vercel** (if applicable)
   - Add env vars in Vercel dashboard
   - Redeploy

### Future Enhancements

**Week 1-2:**
- Monitor traces in production
- Identify slow tool calls
- Track token usage patterns
- Set up cost alerts

**Month 1:**
- Analyze user behavior
- Identify most-used AI features
- Optimize prompts based on data
- Create custom dashboards

**Ongoing:**
- A/B test new prompt versions
- Track feature adoption
- Monitor error rates
- Optimize performance based on traces

---

## Resources

### Official Documentation

- **Langfuse + Vercel AI SDK**: [https://langfuse.com/integrations/frameworks/vercel-ai-sdk](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)
- **Vercel AI SDK Observability**: [https://ai-sdk.dev/providers/observability/langfuse](https://ai-sdk.dev/providers/observability/langfuse)
- **Langfuse Docs**: [https://langfuse.com/docs](https://langfuse.com/docs)
- **Example Repository**: [https://github.com/langfuse/langfuse-vercel-ai-nextjs-example](https://github.com/langfuse/langfuse-vercel-ai-nextjs-example)

### Community Support

- **Langfuse Discord**: [https://langfuse.com/discord](https://langfuse.com/discord)
- **GitHub Discussions**: [https://github.com/orgs/langfuse/discussions](https://github.com/orgs/langfuse/discussions)
- **Twitter/X**: [@langfuse](https://twitter.com/langfuse)

### Pricing & Plans

- **Pricing Page**: [https://langfuse.com/pricing](https://langfuse.com/pricing)
- **Self-Hosting Guide**: [https://langfuse.com/docs/deployment/self-host](https://langfuse.com/docs/deployment/self-host)

---

## Summary Checklist

**Setup (30 minutes total):**
- [ ] Create Langfuse account and get API keys
- [ ] Install npm packages (`@vercel/otel`, `langfuse-vercel`, etc.)
- [ ] Add environment variables (`.env.local` and `.env.template`)
- [ ] Create `instrumentation.ts` at project root
- [ ] Update `app/api/ai/chat/route.ts` with `experimental_telemetry`
- [ ] Test locally and verify traces appear
- [ ] Deploy to production (add env vars in Vercel)

**Ongoing (once set up):**
- [ ] Monitor daily trace activity
- [ ] Track token usage and costs
- [ ] Analyze multi-step tool chains
- [ ] Set up performance alerts
- [ ] Review user analytics weekly

**Success Metrics:**
- Traces appear in Langfuse within 10 seconds of AI requests
- All tool calls are captured with parameters and results
- Token usage is accurately tracked
- Session grouping works correctly
- Cost tracking aligns with OpenAI billing

---

**Questions or issues?** Refer to the troubleshooting section above or open a GitHub discussion in the Langfuse repository.
