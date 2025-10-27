# Design Document

## Overview

This design addresses the critical mobile performance issues by implementing a dual-path architecture: a lightweight mobile experience and the existing rich desktop experience. The core strategy is to detect device type early and conditionally render optimized components while sharing the same backend infrastructure.

The key insight from analyzing the codebase is that the Quill rich text editor, while excellent for desktop, is too heavy for mobile browsers. Additionally, the Pusher WebSocket configuration needs mobile-specific tuning to handle iOS network behavior.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Client                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Device Detection Layer (useMediaQuery + UA)           │ │
│  └─────────────┬──────────────────────────┬───────────────┘ │
│                │                          │                  │
│     ┌──────────▼─────────┐    ┌──────────▼─────────┐       │
│     │  Mobile Path       │    │  Desktop Path      │       │
│     │  - Plain Textarea  │    │  - Quill Editor    │       │
│     │  - WS-only Pusher  │    │  - Full Pusher     │       │
│     │  - Cookie Auth     │    │  - Body Auth       │       │
│     └──────────┬─────────┘    └──────────┬─────────┘       │
│                │                          │                  │
│                └──────────┬───────────────┘                  │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │  Shared Logic   │                        │
│                  │  - Message List │                        │
│                  │  - API Calls    │                        │
│                  │  - State Mgmt   │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Backend APIs   │
                   │  (Unchanged)    │
                   └─────────────────┘
```

### Component Architecture

The design introduces a responsive component system:

1. **DeviceContext**: React context providing device type to all components
2. **ChatInputMobile**: Lightweight textarea-based input for mobile
3. **ChatInputDesktop**: Existing Quill-based input (refactored from current ChatInput)
4. **ChatInput**: Smart wrapper that renders appropriate input based on device
5. **PusherManager**: Enhanced Pusher initialization with mobile-specific config

## Components and Interfaces

### 1. Device Detection Hook

**File**: `hooks/useDeviceDetection.ts`

```typescript
interface DeviceInfo {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  screenWidth: number
}

export function useDeviceDetection(): DeviceInfo
```

**Behavior**:
- Uses `window.matchMedia('(max-width: 767px)')` for responsive detection
- Parses `navigator.userAgent` for iOS/Android detection
- Updates on window resize with debouncing (250ms)
- Memoizes results to prevent unnecessary re-renders

### 2. Device Context

**File**: `contexts/DeviceContext.tsx`

```typescript
interface DeviceContextValue {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
}

export const DeviceContext = React.createContext<DeviceContextValue>()
export const DeviceProvider: React.FC<{ children: React.ReactNode }>
export const useDevice = () => useContext(DeviceContext)
```

**Behavior**:
- Wraps the entire app in `app/layout.tsx`
- Provides device info to all child components
- Single source of truth for device type

### 3. Mobile Chat Input Component

**File**: `components/ChatInputMobile.tsx`

```typescript
interface ChatInputMobileProps {
  onSendMessage: (message: string, reply?: ReplyInfo) => void
  disabled?: boolean
  replyTo?: ReplyInfo
  onCancelReply?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function ChatInputMobile(props: ChatInputMobileProps)
```

**Key Features**:
- Plain `<textarea>` element (no Quill)
- Minimal formatting toolbar (bold, italic, emoji picker only)
- Auto-resize textarea based on content (max 6 lines)
- Markdown support for basic formatting
- Optimized event handlers with passive listeners
- `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`
- `enterkeyhint="send"` for mobile keyboard

**Performance Optimizations**:
- `useCallback` for all event handlers
- Debounced typing indicator (400ms)
- No DOM manipulation during typing
- CSS-only animations

### 4. Desktop Chat Input Component

**File**: `components/ChatInputDesktop.tsx`

This is essentially the current `ChatInput.tsx` renamed and preserved exactly as-is. No changes to functionality.

### 5. Smart Chat Input Wrapper

**File**: `components/ChatInput.tsx` (replaces current)

```typescript
export default function ChatInput(props: ChatInputProps) {
  const { isMobile } = useDevice()
  
  if (isMobile) {
    return <ChatInputMobile {...props} />
  }
  
  return <ChatInputDesktop {...props} />
}
```

### 6. Enhanced Pusher Connection Manager

**File**: `hooks/usePusherConnection.ts`

```typescript
interface PusherConnectionOptions {
  enabled: boolean
  onMessage: (message: ChatMessage) => void
  onTyping: (users: string[]) => void
  username?: string
}

interface PusherConnectionState {
  isConnected: boolean
  connectionState: string
  error?: Error
}

export function usePusherConnection(
  options: PusherConnectionOptions
): PusherConnectionState
```

**Mobile-Specific Behavior**:
- Force WebSocket-only transport on iOS: `enabledTransports: ['ws', 'wss']`
- Aggressive reconnection on visibility change
- Connection state monitoring with visual feedback
- Automatic cleanup on unmount

**Connection Recovery**:
```typescript
// Reconnect on page visibility
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isMobile) {
    pusher.disconnect()
    pusher.connect()
  }
})

// Reconnect on network change (iOS)
window.addEventListener('online', () => {
  if (isMobile) {
    pusher.connect()
  }
})
```

### 7. Fallback Polling Mechanism

**File**: `hooks/useMessagePolling.ts`

```typescript
interface PollingOptions {
  enabled: boolean
  interval: number
  onNewMessages: (messages: ChatMessage[]) => void
}

export function useMessagePolling(options: PollingOptions)
```

**Behavior**:
- Only activates when Pusher connection fails for >10 seconds
- Polls `/api/messages?afterTs=<lastTimestamp>` every 3 seconds
- Automatically disables when Pusher reconnects
- Prevents duplicate messages through timestamp tracking

## Data Models

No changes to existing data models. The mobile path uses the same `ChatMessage` type and API contracts.

### Message Flow (Mobile)

```typescript
// Sending
{
  // Body (cookie mode - username from cookie)
  message: string
  html?: string  // Optional, for markdown-rendered content
  replyTo?: ReplyInfo
  clientTempId: string
}

// Receiving (same as desktop)
{
  _id: string
  username: string
  message: string
  html?: string
  timestamp: Date
  timezone: string
  countryCode?: string
  replyTo?: ReplyInfo
  reactions?: ReactionMap
  editedAt?: Date
}
```

## Error Handling

### Connection Errors

**Visual Indicators**:
- Disconnected state: Red dot in header with "Reconnecting..." text
- Failed state: Yellow warning with "Connection issues" and manual retry button
- Offline state: Gray indicator with "Offline" text

**Recovery Strategy**:
```typescript
const reconnectWithBackoff = (attempt: number) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
  setTimeout(() => {
    pusher.connect()
  }, delay)
}
```

### Input Errors

**Validation**:
- Client-side length check before sending (2000 chars)
- Immediate feedback for oversized messages
- Disable send button when empty or too long

**Network Failures**:
- Remove optimistic message on 500/timeout
- Show toast notification: "Failed to send. Tap to retry."
- Store failed message in localStorage for recovery

### Typing Indicator Errors

**Graceful Degradation**:
- Typing indicator failures don't block message sending
- Silent failure with console warning only
- No user-facing error for typing indicator issues

## Testing Strategy

### Unit Tests

**Device Detection** (`hooks/useDeviceDetection.test.ts`):
- Test mobile detection at various breakpoints
- Test iOS/Android user agent parsing
- Test resize event handling and debouncing

**Mobile Input** (`components/ChatInputMobile.test.tsx`):
- Test textarea auto-resize
- Test markdown formatting
- Test emoji insertion
- Test send button enable/disable logic
- Test typing indicator debouncing

**Pusher Hook** (`hooks/usePusherConnection.test.ts`):
- Test connection initialization
- Test reconnection logic
- Test visibility change handling
- Test error state management

### Integration Tests

**Message Flow**:
- Send message from mobile, verify desktop receives
- Send message from desktop, verify mobile receives
- Test message deduplication with clientTempId
- Test optimistic UI updates and reconciliation

**Connection Resilience**:
- Simulate network disconnect/reconnect
- Simulate tab backgrounding/foregrounding
- Test fallback polling activation
- Test Pusher reconnection after failure

### Manual Testing Checklist

**iPhone 12 Mini** (primary target):
- [ ] Type rapidly without lag
- [ ] Send messages successfully
- [ ] Receive messages in real-time
- [ ] Keyboard doesn't hide input
- [ ] Emoji picker works
- [ ] Reply functionality works
- [ ] Edit messages (within 10 min)
- [ ] Reactions work
- [ ] Scroll performance smooth
- [ ] Network switch handling
- [ ] App backgrounding/foregrounding

**Android Device**:
- [ ] Same checklist as iOS

**Desktop** (regression testing):
- [ ] All existing features work
- [ ] Quill editor unchanged
- [ ] Keyboard shortcuts work
- [ ] Rich text formatting preserved

### Performance Benchmarks

**Mobile Input Lag**:
- Target: <50ms from keypress to render
- Measure: Chrome DevTools Performance tab
- Metric: Input event to paint time

**Message Delivery**:
- Target: <2s from send to receive
- Measure: Console timestamps
- Metric: POST response time + Pusher latency

**Frame Rate**:
- Target: >30 FPS while typing
- Measure: Chrome DevTools FPS meter
- Metric: Sustained frame rate during rapid typing

## Implementation Phases

### Phase 1: Device Detection Infrastructure
- Create `useDeviceDetection` hook
- Create `DeviceContext` and provider
- Integrate into app layout
- Add device info to browser console for debugging

### Phase 2: Mobile Input Component
- Create `ChatInputMobile` with plain textarea
- Implement auto-resize logic
- Add minimal formatting toolbar
- Add emoji picker
- Test input performance

### Phase 3: Component Refactoring
- Rename current `ChatInput` to `ChatInputDesktop`
- Create new `ChatInput` wrapper with conditional rendering
- Update imports in `app/page.tsx`
- Verify desktop experience unchanged

### Phase 4: Pusher Optimization
- Extract Pusher logic to `usePusherConnection` hook
- Add mobile-specific configuration
- Implement reconnection logic
- Add connection state UI indicators

### Phase 5: Fallback Polling
- Create `useMessagePolling` hook
- Implement activation logic (Pusher failure detection)
- Add deduplication logic
- Test polling behavior

### Phase 6: Testing and Refinement
- Run unit tests
- Perform manual testing on iPhone 12 Mini
- Measure performance metrics
- Fix any identified issues
- Regression test desktop

## Design Decisions and Rationales

### Decision 1: Dual Component Path vs. Adaptive Single Component

**Chosen**: Dual component path (separate Mobile and Desktop components)

**Rationale**:
- Clean separation of concerns
- No performance overhead from conditional logic in render path
- Easier to optimize each path independently
- Desktop code remains untouched (zero regression risk)
- Mobile code can be heavily optimized without desktop constraints

**Alternative Considered**: Single component with conditional rendering
- Rejected due to complexity and performance concerns
- Would require extensive refactoring of existing Quill integration

### Decision 2: Plain Textarea vs. Lightweight Rich Text Editor

**Chosen**: Plain textarea with markdown support

**Rationale**:
- Textarea is native, zero-overhead, instant response
- Markdown provides formatting without editor complexity
- Users familiar with markdown from other chat apps
- Can render markdown to HTML on display
- Eliminates all Quill-related performance issues

**Alternative Considered**: Lightweight editor like Draft.js or Slate
- Rejected due to still having significant overhead
- Mobile users rarely need rich formatting
- Markdown is sufficient for 95% of use cases

### Decision 3: WebSocket-Only vs. Multi-Transport on iOS

**Chosen**: WebSocket-only (`enabledTransports: ['ws', 'wss']`)

**Rationale**:
- iOS Safari has known issues with XHR long-polling fallbacks
- WebSocket is more reliable on modern iOS
- Reduces connection complexity
- Faster initial connection
- Lower battery usage

**Alternative Considered**: Allow all transports
- Rejected because XHR fallbacks cause more problems than they solve on iOS
- Polling creates race conditions with message updates

### Decision 4: Optimistic UI vs. Wait for Server

**Chosen**: Optimistic UI with reconciliation

**Rationale**:
- Instant feedback improves perceived performance
- Users expect immediate response when sending
- Server confirmation happens in background
- Reconciliation handles edge cases (duplicates, failures)
- Already partially implemented in current code

**Alternative Considered**: Wait for server response
- Rejected due to poor UX on slow networks
- Creates noticeable lag even on good connections

### Decision 5: Polling Fallback vs. WebSocket-Only

**Chosen**: Polling fallback after WebSocket failure

**Rationale**:
- Provides resilience on problematic networks
- Some corporate/school networks block WebSockets
- Better to have slow updates than no updates
- Automatically disables when WebSocket recovers
- Minimal code complexity

**Alternative Considered**: WebSocket-only with no fallback
- Rejected because it leaves users stranded on restrictive networks
- Polling is a proven fallback strategy

### Decision 6: 768px Breakpoint vs. User Agent Only

**Chosen**: 768px breakpoint as primary, UA as secondary

**Rationale**:
- Responsive design principle (works on tablets, small laptops)
- Handles window resizing gracefully
- User agent alone is unreliable (can be spoofed, varies)
- 768px is industry standard mobile/desktop boundary
- Allows testing mobile mode on desktop by resizing

**Alternative Considered**: User agent detection only
- Rejected because it doesn't handle tablets well
- Doesn't respond to window resizing
- Less flexible for testing

## Security Considerations

### Input Sanitization

Mobile input uses plain text, but markdown rendering requires sanitization:

```typescript
const sanitizeMarkdown = (text: string): string => {
  // Escape HTML entities
  text = text.replace(/[<>&"']/g, (char) => htmlEntities[char])
  
  // Allow only safe markdown patterns
  // Bold: **text**
  // Italic: *text*
  // Links: [text](url) - validate URL scheme
  
  return text
}
```

### Cookie Security

Mobile uses cookie-based auth (already implemented):
- Cookies set with `SameSite=Lax`
- `HttpOnly` flag for security
- 14-day expiration
- No sensitive data in cookies (only username, country code)

### XSS Prevention

- All user input escaped before rendering
- Markdown renderer uses whitelist approach
- No `dangerouslySetInnerHTML` in mobile components
- CSP headers prevent inline script execution

## Performance Optimizations

### Mobile Input Optimizations

1. **Passive Event Listeners**:
```typescript
textarea.addEventListener('input', handler, { passive: true })
```

2. **Debounced Typing Indicator**:
```typescript
const debouncedTyping = useMemo(
  () => debounce((isTyping: boolean) => onTyping?.(isTyping), 400),
  [onTyping]
)
```

3. **Memoized Callbacks**:
```typescript
const handleInput = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
  setText(e.target.value)
  debouncedTyping(true)
}, [debouncedTyping])
```

4. **CSS-Only Animations**:
```css
.mobile-input {
  transition: height 0.2s ease;
  will-change: height;
}
```

### Pusher Optimizations

1. **Connection Pooling**: Reuse single Pusher instance across components
2. **Event Unbinding**: Clean up listeners on unmount
3. **Throttled Broadcasts**: Limit typing indicator updates to 300ms intervals
4. **Lazy Reconnection**: Only reconnect when tab is visible

### Rendering Optimizations

1. **Virtual Scrolling**: Consider for message list if >1000 messages
2. **Image Lazy Loading**: Already implemented with `loading="lazy"`
3. **Memoized Message Components**: Prevent re-renders of unchanged messages
4. **Debounced Scroll Handlers**: Reduce scroll event processing

## Monitoring and Observability

### Metrics to Track

1. **Input Lag**: Time from keypress to render (target: <50ms)
2. **Message Delivery Time**: Send to receive latency (target: <2s)
3. **Pusher Connection Uptime**: % of time connected (target: >95%)
4. **Fallback Polling Activation Rate**: How often polling is needed (target: <5%)
5. **Mobile vs Desktop Usage**: Track device type distribution

### Logging Strategy

**Development Mode**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Mobile] Input lag:', performance.now() - startTime)
  console.log('[Pusher] Connection state:', state)
}
```

**Production Mode**:
- Log only errors and critical events
- Use structured logging for easier parsing
- Include device type in all logs
- Send errors to monitoring service (e.g., Sentry)

### Debug Mode

Add URL parameter `?debug=1` to enable:
- Connection state indicator in UI
- Performance metrics overlay
- Detailed console logging
- Network request timing

## Backward Compatibility

### API Compatibility

No changes to API contracts. Mobile uses same endpoints:
- `POST /api/messages` - Cookie-based auth already supported
- `GET /api/messages` - No changes
- `PATCH /api/messages` - No changes
- `POST /api/messages/reactions` - No changes

### Database Compatibility

No schema changes. Mobile messages stored identically to desktop messages.

### Message Format Compatibility

Desktop and mobile messages are interchangeable:
- Plain text messages work on both
- Markdown from mobile renders as HTML on desktop
- Rich HTML from desktop displays as plain text on mobile (graceful degradation)

## Deployment Strategy

### Rollout Plan

1. **Deploy to staging**: Test on real devices
2. **Canary release**: 5% of mobile traffic
3. **Monitor metrics**: Input lag, connection uptime, error rates
4. **Gradual rollout**: 25% → 50% → 100% over 3 days
5. **Rollback plan**: Feature flag to disable mobile path

### Feature Flag

```typescript
const ENABLE_MOBILE_OPTIMIZATION = 
  process.env.NEXT_PUBLIC_MOBILE_OPT === 'true'

if (ENABLE_MOBILE_OPTIMIZATION && isMobile) {
  return <ChatInputMobile />
}
return <ChatInputDesktop />
```

### Rollback Procedure

If critical issues arise:
1. Set `NEXT_PUBLIC_MOBILE_OPT=false`
2. Redeploy (takes ~2 minutes)
3. Mobile users revert to desktop experience
4. Investigate and fix issues
5. Re-enable after validation

## Future Enhancements

### Phase 2 Features (Post-Launch)

1. **Progressive Web App**: Add service worker for offline support
2. **Push Notifications**: Native notifications for new messages
3. **Voice Messages**: Record and send audio on mobile
4. **Image Compression**: Reduce upload sizes on mobile
5. **Dark Mode Optimization**: Battery-saving OLED black theme
6. **Gesture Controls**: Swipe to reply, long-press for reactions

### Performance Improvements

1. **WebAssembly Markdown Parser**: Faster rendering
2. **IndexedDB Caching**: Offline message storage
3. **Differential Sync**: Only fetch changed messages
4. **WebRTC Data Channels**: Peer-to-peer messaging for low latency

### Accessibility Improvements

1. **Screen Reader Optimization**: Better ARIA labels on mobile
2. **Voice Input**: Speech-to-text for hands-free messaging
3. **High Contrast Mode**: Improved visibility
4. **Larger Touch Targets**: Easier interaction for accessibility
