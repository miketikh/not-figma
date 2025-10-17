# Feature Planning: AI Voice Capabilities

**Date:** 2025-10-17
**Status:** Exploration Phase
**Next Step:** Discussion → PRD Creation

## Feature Request Summary

Add voice interaction capabilities to the existing AI chat assistant in the Not-Figma canvas. Users should be able to switch between text and voice modes, with clear visual feedback when voice mode is active (pulsing voice icon). The AI should support both speech-to-text input (users speaking commands) and text-to-speech output (AI responding with voice), creating a fully conversational voice experience.

## Initial Questions & Clarifications

### Scope & User Experience

- **Question 1: Voice mode exclusivity** - Should voice mode completely replace text input when active, or should users be able to type even when voice mode is enabled? (e.g., can they toggle between typing and speaking mid-conversation?)

- **Question 2: TTS response control** - Should AI voice responses be automatic when in voice mode, or should users have per-message control (e.g., a speaker icon on each AI response to play/stop TTS)?

- **Question 3: Voice activation method** - Should users manually press-and-hold a button to speak (like push-to-talk), or should there be continuous voice activation with automatic speech detection? Or both options?

- **Question 4: Conversation continuity** - When switching from text to voice mode (or vice versa), should the existing chat history remain visible and contextually relevant?

- **Question 5: Voice feedback granularity** - Should the pulsing voice icon show different states: listening, processing speech-to-text, waiting for AI, playing TTS? Or just a simple "voice active" state?

### Technical Constraints

- **Question 6: Browser compatibility** - Which browsers should we prioritize? (Safari, Chrome, Firefox all have different Web Speech API support levels)

- **Question 7: Performance budget** - Are there concerns about OpenAI API costs for TTS/STT? Should we implement usage limits or warnings for voice commands?

- **Question 8: Offline support** - Should voice features gracefully degrade when offline, or require internet connection (since OpenAI APIs are cloud-based)?

### Integration Considerations

- **Question 9: Mobile support** - Is mobile voice interaction a priority? Mobile browsers have varying support for Web Speech API and microphone permissions.

- **Question 10: Accessibility** - How should voice features interact with screen readers and other assistive technologies?

## Possible User Stories

### Primary Use Cases

1. **As a designer using the canvas, I want to enable voice mode so that I can create shapes hands-free while referencing physical sketches**
   - Scenario: User clicks voice mode toggle, sees pulsing microphone icon, says "create a red circle at 300, 400", hears AI confirm the action
   - Expected outcome: Circle appears on canvas, AI responds with voice confirmation like "Created a red circle at 300, 400"

2. **As a user working on complex layouts, I want to speak multiple commands in sequence so that I can iterate quickly without typing**
   - Scenario: Voice mode active, user says "make it bigger", then "rotate it 45 degrees", then "change color to blue"
   - Expected outcome: Each command is recognized, executed, and confirmed with voice feedback, maintaining conversational context

3. **As a collaborative designer, I want to toggle between voice and text input so that I can use voice when alone and text when in shared spaces**
   - Scenario: User in office switches from voice mode (at home) to text mode, conversation history persists
   - Expected outcome: Seamless mode switching with no loss of context, text input field becomes active again

4. **As a user exploring the AI assistant, I want clear visual feedback about voice status so that I know when the system is listening vs processing vs responding**
   - Scenario: User enables voice mode, sees pulsing icon during listening, processing spinner during STT/AI inference, and speaker icon during TTS playback
   - Expected outcome: User always understands what state the voice system is in

5. **As a user with accessibility needs, I want to receive AI responses via voice so that I can use the canvas without reading text**
   - Scenario: User with visual impairment or dyslexia enables voice mode, receives all AI responses as spoken audio
   - Expected outcome: Full voice-to-voice conversation with the AI assistant

### Secondary/Future Use Cases

- **As a power user, I want to customize TTS voice and speed** - Settings to choose voice (male/female, different accents) and playback speed
- **As a multilingual designer, I want voice commands in my native language** - Support for non-English voice input/output
- **As a user on slow connections, I want to see transcripts of my voice commands** - Display STT results as text before sending to AI for transparency
- **As a privacy-conscious user, I want to use on-device speech recognition** - Option to use browser's built-in Web Speech API instead of sending audio to OpenAI
- **As a mobile user, I want voice commands optimized for touch** - Large voice button, haptic feedback on iOS/Android

## Feature Possibilities

### Option A: Browser Web Speech API (Hybrid Approach)

**Description:** Use browser's built-in Web Speech API for speech-to-text (free, fast, on-device in some browsers) and OpenAI's TTS API for AI voice responses. This creates a hybrid system leveraging native browser capabilities where available.

**Pros:**
- Zero cost for STT (uses browser's built-in speech recognition)
- Faster STT processing (no network round-trip for speech recognition)
- Better privacy for voice input (processed locally in some browsers)
- Works well on mobile devices (good iOS Safari support)
- Simpler implementation (no need to handle audio recording/encoding)
- Seamless integration with existing chat flow

**Cons:**
- Browser compatibility issues (Chrome has best support, Safari limited, Firefox inconsistent)
- STT accuracy varies by browser and device
- Limited control over STT model (can't fine-tune for design terminology)
- Requires fallback for unsupported browsers
- No punctuation control in some browsers
- Different voices across browsers for TTS fallback

**What we'd need:**
- Feature detection for Web Speech API (`window.SpeechRecognition` or `window.webkitSpeechRecognition`)
- OpenAI account with TTS API access (already have for existing AI features)
- UI toggle for voice mode in AIChatPanel
- State management for voice recording status
- Microphone permission handling
- Audio playback controls for TTS responses

**Implementation approach:**
```typescript
// Use browser's SpeechRecognition for input
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';

// Send recognized text to existing AI chat endpoint
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  sendMessage({ message: transcript, ... });
};

// Use OpenAI TTS API for AI responses
const response = await fetch('/api/ai/tts', {
  method: 'POST',
  body: JSON.stringify({ text: aiMessage })
});
const audioBlob = await response.blob();
const audio = new Audio(URL.createObjectURL(audioBlob));
audio.play();
```

### Option B: Full OpenAI Audio Stack (Whisper + TTS)

**Description:** Use OpenAI's Whisper API for speech-to-text and TTS API for text-to-speech, creating a fully cloud-based voice solution with consistent quality across all browsers and devices.

**Pros:**
- Consistent STT quality across all browsers and devices
- Better accuracy for complex/technical terms
- Can fine-tune Whisper model for design vocabulary (future)
- Handles multiple languages seamlessly
- Punctuation and formatting handled well
- Professional-quality TTS voices
- Single vendor (easier billing/monitoring)

**Cons:**
- Higher costs (both STT and TTS are metered APIs)
- Increased latency (audio upload + processing time)
- Requires audio recording and encoding in browser
- More complex implementation (handle MediaRecorder, audio formats, chunking)
- Privacy concerns (voice data sent to OpenAI)
- Requires more robust error handling for network issues

**What we'd need:**
- OpenAI account with Whisper and TTS API access (already have API key)
- Browser MediaRecorder API for capturing audio
- Audio encoding/compression (WebM, MP3, or WAV)
- New API route: `/api/ai/stt` for Whisper transcription
- New API route: `/api/ai/tts` for voice synthesis (may already exist)
- Audio upload handling (multipart/form-data or base64 encoding)
- Chunking strategy for long recordings
- Usage monitoring and rate limiting

**Implementation approach:**
```typescript
// Record audio with MediaRecorder
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);
const chunks = [];
mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

// Send audio to Whisper API
const audioBlob = new Blob(chunks, { type: 'audio/webm' });
const formData = new FormData();
formData.append('audio', audioBlob);

const response = await fetch('/api/ai/stt', {
  method: 'POST',
  body: formData
});
const { transcript } = await response.json();
```

### Option C: Real-Time Streaming Voice (Advanced)

**Description:** Use OpenAI's new real-time voice API (if available) or implement streaming for both input and output, allowing for conversational interruptions and more natural interactions. Think of it like ChatGPT's voice mode.

**Pros:**
- Most natural conversational experience
- Can interrupt AI while it's speaking
- Lower perceived latency (streaming reduces wait time)
- More engaging user experience
- Future-proof architecture
- Enables voice-only mode (no text display needed)

**Cons:**
- Much more complex implementation (WebSockets, streaming protocols)
- Higher costs (real-time APIs typically more expensive)
- Requires significant backend changes
- May need separate WebSocket server or use Server-Sent Events
- Harder to debug and test
- Browser support for real-time audio streaming varies
- Context management becomes more complex

**What we'd need:**
- OpenAI real-time API access (may be in beta or not yet available)
- WebSocket connection handling (client and server)
- Streaming audio playback buffers
- Sophisticated state management for interruptions
- Voice Activity Detection (VAD) for interruptions
- Separate architecture from existing text chat
- Extensive testing for edge cases (network drops, long pauses, etc.)

**Note:** This option is likely out of scope for initial implementation but worth considering for future iterations.

### Option D: Hybrid with Browser TTS Fallback (Recommended)

**Description:** Combine Option A's browser STT with a tiered TTS approach: use OpenAI TTS for best quality by default, but fallback to browser's built-in `SpeechSynthesis` API when OpenAI TTS fails or for cost optimization.

**Pros:**
- Best balance of cost, quality, and reliability
- Zero-cost STT (browser built-in)
- High-quality TTS from OpenAI when available
- Automatic fallback ensures voice always works
- Simpler than full OpenAI stack
- Good mobile support
- Reasonable implementation complexity

**Cons:**
- TTS quality varies between primary and fallback
- Need to handle two TTS code paths
- Browser TTS voices vary by device (inconsistent experience)
- Still requires OpenAI TTS API budget
- Feature detection and capability testing needed

**What we'd need:**
- Everything from Option A (Web Speech API)
- OpenAI TTS API integration
- Fallback logic for TTS (`window.speechSynthesis`)
- User preference setting for TTS quality vs cost
- Error handling for both TTS paths

**Implementation approach:**
```typescript
// Try OpenAI TTS first
try {
  const response = await fetch('/api/ai/tts', { ... });
  const audioBlob = await response.blob();
  const audio = new Audio(URL.createObjectURL(audioBlob));
  await audio.play();
} catch (error) {
  // Fallback to browser TTS
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}
```

## Technical Considerations

### Architecture Thoughts

**Voice State Management:**
- Add voice mode state to canvas store: `voiceMode: boolean`, `voiceStatus: 'idle' | 'listening' | 'processing' | 'speaking'`
- Track current audio playback to allow stop/cancel
- Handle microphone permission state and errors
- Store user's voice preferences (language, TTS voice, playback speed)

**Integration with Existing Chat:**
- Voice commands flow through same `/api/ai/chat` endpoint (send transcript as `message`)
- AI responses trigger both text display AND TTS playback when voice mode active
- Chat history includes voice transcripts (for transparency and debugging)
- Tool results are spoken as natural language ("I created a red circle at 300, 400")

**Audio Handling:**
- Browser `MediaRecorder` for capturing voice (Option B/C)
- `Audio` element for TTS playback with controls
- `SpeechRecognition` API for STT (Option A/D)
- `SpeechSynthesis` API for fallback TTS (Option D)
- Microphone permission prompt on first use

**Performance Considerations:**
- STT with browser API: < 500ms after speech ends
- Whisper API STT: 1-3 seconds (includes upload + processing)
- OpenAI TTS: 1-2 seconds for short responses, 3-5 seconds for long
- Browser TTS: Instant (no network delay)
- Audio streaming could reduce perceived latency

### Dependencies & Integrations

**Existing features affected:**
- **AIChatPanel component** - Add voice mode toggle, microphone button, pulsing animation
- **useAIChat hook** - Extend to handle voice input and TTS playback
- **Canvas store** - Add voice-related state slices
- **AI chat API** - Potentially add `/api/ai/stt` and `/api/ai/tts` endpoints

**New dependencies needed:**
- No new npm packages required for Option A or D (browser APIs only)
- Option B might benefit from audio encoding library (`lamejs` for MP3, `opus-recorder` for Opus)
- Audio visualization library (optional): `wavesurfer.js` for showing speech waveforms
- Voice Activity Detection library (optional, for advanced features): `@tensorflow-models/speech-commands`

**Data/state management:**
- Add to canvas store: `voiceMode`, `voiceStatus`, `isSpeaking`, `currentAudioUrl`
- Add to AI chat hook: `startListening()`, `stopListening()`, `speakResponse()`
- Microphone permission stored in localStorage (prompt once, remember choice)
- TTS playback queue (if multiple AI responses happen quickly)

### Potential Challenges

**Challenge 1: Browser Compatibility for Web Speech API**
- Chrome/Edge: Full support (SpeechRecognition, SpeechSynthesis)
- Safari iOS: Good support but requires user gesture to start
- Firefox: Limited/experimental support for SpeechRecognition
- Possible solutions:
  - Feature detection and show warning for unsupported browsers
  - Fallback to text-only mode in unsupported browsers
  - Progressive enhancement: voice as enhancement, not requirement
  - Consider Option B (Whisper) for Firefox users specifically

**Challenge 2: Microphone Permission Handling**
- Browser shows permission prompt on first use (can be jarring)
- Users may deny permission or revoke later
- Possible solutions:
  - Friendly pre-permission modal explaining why we need mic access
  - Graceful error handling with clear instructions to enable
  - Detect permission state and show status in UI
  - Remember permission denial and don't prompt repeatedly

**Challenge 3: Handling Background Noise and Accents**
- Web Speech API STT can struggle with noisy environments or non-native accents
- OpenAI Whisper is better but not perfect
- Possible solutions:
  - Show transcript before sending (let user edit if needed)
  - "Did you mean...?" confirmation for low-confidence transcriptions
  - Allow users to repeat command if AI misunderstood
  - Noise cancellation using WebAudio API (advanced)

**Challenge 4: TTS Playback Interruptions**
- User might want to speak again while AI is talking
- Multiple AI responses queued up
- Possible solutions:
  - Stop current TTS when user starts speaking again
  - Add "Skip" button to skip current voice response
  - Queue management: clear queue if user interrupts
  - Visual indicator of remaining queued responses

**Challenge 5: Voice Response Formatting**
- AI chat responses formatted for text (may include markdown, lists, etc.)
- Need to convert to natural speech
- Possible solutions:
  - Strip markdown before TTS (remove `**bold**`, `- list items`, etc.)
  - Convert structured data to natural sentences ("Created 3 objects: a rectangle, circle, and line")
  - System prompt adjustment: ask AI to format voice responses differently when in voice mode
  - Separate prompt for voice mode: "Respond conversationally, as if speaking aloud"

**Challenge 6: Cost Management for OpenAI TTS**
- TTS API pricing: ~$15 per 1M characters
- Long AI responses could get expensive
- Possible solutions:
  - Truncate very long responses before TTS (keep text, shorten voice)
  - User setting: "Enable TTS only for short responses"
  - Rate limiting: max N voice responses per user per day
  - Show cost estimate in settings
  - Option D fallback to browser TTS for long responses

**Challenge 7: Real-Time Feedback During Speech**
- User doesn't know if system is listening or if speech ended
- Possible solutions:
  - Pulsing microphone icon while listening
  - Real-time interim transcript display (Web Speech API supports this)
  - Waveform visualization showing audio input level
  - Auto-stop after 2-3 seconds of silence (Web Speech API default)
  - Push-to-talk alternative: hold button to speak, release to send

**Challenge 8: Mobile Optimization**
- Mobile browsers have different behavior (Safari requires user gesture)
- Keyboard may obscure interface when speech recognition starts
- Touch targets need to be large enough
- Possible solutions:
  - Large voice button (48px minimum tap target)
  - Dismiss keyboard when voice mode starts
  - Test extensively on iOS Safari and Android Chrome
  - Consider mobile-first voice UI (fullscreen voice interface?)

## User Experience Sketch

### User Flow Ideas

**Activating Voice Mode:**
1. User opens AI chat panel (already implemented)
2. User clicks "Voice Mode" toggle button (new) next to text input
3. Browser prompts for microphone permission (first time only)
4. User grants permission
5. Voice mode activates: microphone icon appears, pulsing gently
6. Text input field dims or hides (depending on UX approach)

**Speaking a Command:**
1. User clicks microphone button (or it's auto-active in continuous mode)
2. Icon pulses faster, status shows "Listening..."
3. User says: "Create a red circle at 300, 400"
4. Visual waveform or audio level indicator shows speech detected
5. After 1-2 seconds of silence, recognition stops automatically
6. Status changes to "Processing..." with spinner
7. Transcript appears briefly: "Create a red circle at 300, 400" (user can edit if wrong)
8. AI processes command (existing flow)
9. Circle appears on canvas
10. AI text response appears in chat: "Created a red circle at (300, 400)"
11. TTS plays voice: "Created a red circle at 300, 400"
12. During TTS playback, speaker icon animates
13. Microphone button ready for next command (returns to gentle pulse)

**Switching Back to Text Mode:**
1. User clicks "Voice Mode" toggle to disable
2. Pulsing microphone icon disappears
3. Text input field becomes active again
4. Chat history remains visible
5. User can continue conversation with typing

**Error Handling Flow:**
1. Microphone permission denied
   - Show error message: "Microphone access required for voice mode"
   - Provide instructions to enable in browser settings
   - Toggle automatically disables voice mode
2. Speech not recognized
   - Show: "I didn't catch that. Please try again."
   - Microphone remains active for retry
3. Network error during TTS
   - Fallback to browser TTS (Option D)
   - Or show text-only response with error note

### UI/UX Considerations

**Interface elements needed:**
- **Voice mode toggle** - Switch-style toggle button in chat panel header (near AI Assistant title)
- **Microphone button** - Large circular button (replaces or appears alongside text input)
  - States: idle (gray), listening (blue pulse), processing (spinner), error (red)
- **Status text** - Small label under microphone: "Tap to speak", "Listening...", "Processing..."
- **Audio level indicator** - Optional: circular progress ring around mic button showing input volume
- **TTS controls** - Stop button to cancel current voice playback, playback progress indicator
- **Permission prompt** - Custom modal before browser permission prompt explaining why we need access
- **Voice settings** - In chat panel or global settings: language, TTS voice preference, speed

**Feedback mechanisms:**
- **Visual pulse animation** - Microphone icon pulses at 1Hz when idle/waiting, 2-3Hz when actively listening
- **Color changes** - Blue = active/listening, gray = idle, green = speaking, red = error
- **Interim transcripts** - Show partial recognition results as user speaks (builds confidence)
- **Waveform visualization** - Optional: animated bars showing audio input level
- **TTS playback indicator** - Speaker icon animates or pulses during AI voice response
- **Permission status badge** - Small indicator showing mic permission granted/denied

**Error handling:**
- **Permission denied** - Clear message with link to browser settings help article
- **Speech not recognized** - "Couldn't understand. Try speaking more clearly or closer to microphone."
- **Network error** - "Connection issue. Trying again..." with retry button
- **Unsupported browser** - "Voice mode not supported in this browser. Try Chrome or Safari."
- **Background noise** - If STT confidence low: "Background noise detected. Find a quieter space?"

## Open Questions & Discussion Points

### Decision Points

- [ ] **Decision 1: Which implementation approach?**
  - Considerations:
    - Option A (Browser STT + OpenAI TTS): Fastest to implement, lowest cost, good enough quality
    - Option D (Hybrid with fallback): Best user experience, good quality, manageable cost
    - Option B (Full OpenAI): Best quality, highest cost, most complex
  - **Recommendation:** Start with Option D for best balance

- [ ] **Decision 2: Voice activation method**
  - Considerations:
    - Push-to-talk (hold button): More control, less accidental activation, better for noisy environments
    - Auto-activation (tap to toggle): More convenient, hands-free, feels more natural
    - Both options: Best flexibility, more complex UI
  - **Recommendation:** Start with tap-to-toggle, add push-to-talk in Phase 2 if requested

- [ ] **Decision 3: TTS response control**
  - Considerations:
    - Auto-play all responses: Most conversational, but may be annoying for some users
    - Manual play per message: User control, but breaks conversation flow
    - Auto-play with easy stop: Balance between convenience and control
  - **Recommendation:** Auto-play with prominent stop button and setting to disable auto-play

- [ ] **Decision 4: Transcript editing**
  - Considerations:
    - No editing (send directly): Faster flow, more conversational
    - Show transcript with edit option: Better accuracy, user confidence, but adds friction
    - Show only on low confidence: Smart compromise
  - **Recommendation:** Show transcript briefly (2 seconds) with quick edit button, auto-send if not edited

- [ ] **Decision 5: Mobile priority**
  - Considerations:
    - Desktop-first: Easier to develop/test, most users likely on desktop for design work
    - Mobile-first: Voice is very useful on mobile, broader accessibility
    - Equal priority: Best experience everywhere, but more work
  - **Recommendation:** Desktop-first for MVP, ensure mobile compatibility in Phase 2

### Unknowns

- **Voice API rate limits** - What are OpenAI's rate limits for TTS/Whisper APIs? Need to test with production keys
- **Browser compatibility matrix** - Need comprehensive testing across browsers/versions/devices
- **Audio quality requirements** - What bitrate/format is acceptable for Whisper API? WebM vs MP3 vs WAV?
- **Latency benchmarks** - What's the actual end-to-end latency for each option? Need to prototype
- **User preference distribution** - Will users actually use voice, or is it a novelty? A/B test in beta
- **Cost per voice command** - Real-world cost analysis needed (average transcript length, TTS length)
- **Accessibility compliance** - Does this meet WCAG standards for voice interfaces?
- **Multi-language support** - Which languages should we support first? Does browser STT support them?

### Trade-offs to Discuss

- **Cost vs Quality** - OpenAI TTS is expensive but high quality, browser TTS is free but variable quality
  - Impact: User experience vs operating costs
  - Options: Start with free, add premium voices as paid feature?

- **Latency vs Accuracy** - Browser STT is fast but less accurate, Whisper is slower but better
  - Impact: Perceived responsiveness vs command success rate
  - Options: Let users choose in settings, or use browser STT with Whisper fallback on errors?

- **Simplicity vs Control** - Auto-activation is simple, push-to-talk gives more control
  - Impact: Ease of use vs handling edge cases (background noise, accidental activation)
  - Options: Start simple, add advanced controls based on feedback?

- **Privacy vs Features** - Browser APIs are more private, cloud APIs enable better features
  - Impact: User trust vs functionality (transcription quality, fine-tuning potential)
  - Options: Disclose data handling clearly, offer on-device option (browser STT only)?

## Rough Implementation Thoughts

### Core Components Needed

1. **VoiceToggle Component**
   - Purpose: Switch between text and voice mode in chat panel
   - Rough approach: Toggle button in panel header, updates `voiceMode` in store
   - Location: `app/canvas/_components/VoiceToggle.tsx` or add to existing `AIChatPanel.tsx`

2. **VoiceInput Component**
   - Purpose: Handle microphone button, status display, audio visualization
   - Rough approach: Replaces or augments text input area when voice mode active
   - Contains: Mic button, status text, audio level indicator, stop button
   - Location: `app/canvas/_components/VoiceInput.tsx`

3. **useVoiceRecognition Hook**
   - Purpose: Manage speech-to-text lifecycle (start, stop, error handling)
   - Rough approach:
     - Option A/D: Wraps Web Speech API (`SpeechRecognition`)
     - Option B: Uses MediaRecorder + calls `/api/ai/stt`
   - Returns: `startListening()`, `stopListening()`, `transcript`, `isListening`, `error`
   - Location: `app/canvas/_hooks/useVoiceRecognition.ts`

4. **useTextToSpeech Hook**
   - Purpose: Manage text-to-speech playback with queue management
   - Rough approach:
     - Calls `/api/ai/tts` (OpenAI endpoint)
     - Fallback to `window.speechSynthesis` on error (Option D)
     - Queue multiple responses, stop/skip controls
   - Returns: `speak(text)`, `stop()`, `isSpeaking`, `playbackProgress`
   - Location: `app/canvas/_hooks/useTextToSpeech.ts`

5. **TTS API Route** (Optional for Option B/D)
   - Purpose: Server-side endpoint to call OpenAI TTS API
   - Rough approach: Similar to `/api/ai/chat`, accepts text and returns audio blob
   - Location: `app/api/ai/tts/route.ts`

6. **STT API Route** (Optional for Option B)
   - Purpose: Server-side endpoint to call OpenAI Whisper API
   - Rough approach: Receives audio file, sends to Whisper, returns transcript
   - Location: `app/api/ai/stt/route.ts`

7. **Voice State in Canvas Store**
   - Purpose: Global state management for voice features
   - Rough approach: Add slice to existing Zustand store
   - Fields: `voiceMode: boolean`, `voiceStatus: string`, `micPermission: string`, `ttsEnabled: boolean`
   - Actions: `toggleVoiceMode()`, `setVoiceStatus()`, `setMicPermission()`
   - Location: Extend existing `app/canvas/_store/canvas-store.ts`

8. **Audio Utilities**
   - Purpose: Helper functions for audio handling (format conversion, etc.)
   - Rough approach: Pure functions for audio blob processing, permission checking
   - Functions: `checkMicPermission()`, `requestMicPermission()`, `formatAudioForWhisper()`, `stripMarkdown()`
   - Location: `app/canvas/_lib/audio-utils.ts`

### Integration Points

**Frontend:**
- **AIChatPanel component**: Add VoiceToggle and VoiceInput components
- **useAIChat hook**: Integrate with useVoiceRecognition (send transcript as message) and useTextToSpeech (speak responses)
- **Canvas store**: Add voice state management slice
- **Types**: Extend `types/ai.ts` with voice-related types (`VoiceStatus`, `TTSOptions`, `STTResult`)

**Backend:**
- **`/api/ai/tts` route**: New endpoint to call OpenAI TTS API (if Option B or D)
- **`/api/ai/stt` route**: New endpoint to call OpenAI Whisper API (if Option B)
- **Existing `/api/ai/chat`**: May need to accept voice mode flag to adjust response formatting

**Database:**
- **User preferences**: Store in Firestore or localStorage: preferred TTS voice, language, auto-play setting
- **Usage tracking**: Optional analytics for voice feature usage (for cost monitoring)

**APIs/Services:**
- **OpenAI TTS API**: https://api.openai.com/v1/audio/speech (for Options B, D)
- **OpenAI Whisper API**: https://api.openai.com/v1/audio/transcriptions (for Option B)
- **Browser Web Speech API**: `window.SpeechRecognition` and `window.speechSynthesis` (for Options A, D)

## Success Criteria (Preliminary)

**Phase 1 MVP:**
- Users can enable voice mode via toggle in chat panel
- Microphone icon pulses clearly when voice mode is active
- Users can speak commands and see transcripts before sending (or auto-send)
- Speech-to-text accurately recognizes design commands (>85% accuracy in quiet environments)
- AI responds with both text and voice in voice mode
- TTS voice is clear and natural-sounding
- Voice mode works reliably in Chrome/Edge (primary browsers)
- Microphone permission handling is user-friendly with clear instructions
- Users can stop TTS playback mid-response
- Voice mode toggle preserves chat history and context

**Qualitative Goals:**
- Users report voice mode feels natural and conversational
- Voice commands are faster than typing for simple shapes
- Accessibility feedback indicates voice features are helpful
- No significant increase in user complaints about costs (if metered)

**Performance Benchmarks:**
- STT latency < 1 second (browser API) or < 3 seconds (Whisper)
- TTS starts playing within 2 seconds of AI response
- End-to-end voice command to canvas update: < 5 seconds
- No audio glitches or cutoffs during playback

**Cost Targets (if using OpenAI TTS):**
- Average cost per voice interaction < $0.01
- Total monthly voice API costs < 10% of total AI API costs
- Clear usage monitoring and alerts if costs spike

## Next Steps

### Before Moving to PRD

- [ ] Discuss and decide on implementation approach (Option A, B, C, or D - leaning toward D)
- [ ] Validate browser compatibility requirements (which browsers must we support?)
- [ ] Confirm budget for OpenAI TTS API usage
- [ ] Answer open questions about voice activation method and TTS control
- [ ] Test Web Speech API on target browsers/devices (quick prototype)

### To Prepare for PRD Creation

- **Prototype basic voice input**: Spend 1-2 hours building a simple Web Speech API test in a CodePen or separate Next.js page to validate browser support and UX
- **Cost estimation**: Calculate projected OpenAI TTS costs based on expected usage (X users, Y commands/day, Z avg response length)
- **Competitor research**: Test voice interfaces in other design tools (Figma plugins, Adobe apps, Framer AI) for UX patterns
- **Accessibility review**: Research WCAG guidelines for voice interfaces, consult accessibility documentation
- **Mobile testing setup**: Prepare iOS/Android test devices for mobile voice testing

---

## Discussion Notes

_Space for discussion thoughts:_

**Initial thoughts from Claude:**
- **Recommended approach**: Option D (Hybrid with Browser TTS Fallback) offers the best balance of cost, quality, and reliability for MVP
- **Voice activation**: Start with tap-to-toggle for simplicity, can add push-to-talk later based on feedback
- **Key risk**: Browser compatibility could be a major pain point - recommend comprehensive testing matrix early
- **Quick win**: Pulsing microphone animation is easy to implement and provides immediate visual feedback
- **Cost management**: Using browser STT keeps costs low while OpenAI TTS for responses is reasonable ($0.001-0.01 per interaction)
- **Mobile considerations**: Voice is particularly powerful on mobile, but needs careful testing on iOS Safari (requires user gesture to start recording)

**Questions for stakeholder:**
1. Is there a specific browser/platform we're targeting primarily? (Desktop Chrome, iOS Safari, etc.)
2. What's the budget/comfort level for OpenAI TTS API usage?
3. Should we prioritize mobile voice interaction or desktop-first?
4. Any accessibility requirements or standards we must meet?

---

## Transition to PRD

Once we've discussed and aligned on the approach, we'll create a formal PRD that includes:

- Structured requirements for voice input and output
- Phased implementation plan (Phase 1: Basic voice, Phase 2: Advanced features)
- Specific code changes across components/hooks/API routes
- Detailed acceptance criteria for voice features
- Technical specifications for audio handling and API integration
- Testing strategy for browser compatibility and edge cases
- Cost projection and monitoring plan
- Accessibility compliance checklist
