# Implementation Plan

- [x] 1. Create device detection infrastructure
  - Create `hooks/useDeviceDetection.ts` hook that detects mobile devices using screen width (768px breakpoint) and user agent parsing
  - Implement window resize listener with 250ms debouncing to handle responsive changes
  - Return device info object with `isMobile`, `isIOS`, `isAndroid`, and `screenWidth` properties
  - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 1.1 Create device context provider
  - Create `contexts/DeviceContext.tsx` with React context for device information
  - Implement `DeviceProvider` component that wraps children and provides device info
  - Export `useDevice` hook for consuming device context in components
  - _Requirements: 1.5, 6.4_

- [x] 1.2 Integrate device context into app
  - Wrap the app content in `app/page.tsx` with `DeviceProvider`
  - Verify device detection works by logging device info to console in development mode
  - _Requirements: 6.1, 6.5_

- [x] 2. Create mobile chat input component
  - Create `components/ChatInputMobile.tsx` with plain textarea element instead of Quill editor
  - Implement auto-resize logic for textarea (max 6 lines) based on content
  - Add mobile-optimized attributes: `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="send"`
  - Implement character counter with 2000 character limit
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.3, 4.4_

- [x] 2.1 Add minimal formatting toolbar for mobile
  - Create compact toolbar with only bold, italic, and emoji picker buttons
  - Position toolbar above textarea to avoid keyboard overlap
  - Implement markdown insertion for bold (**text**) and italic (*text*)
  - Add emoji picker with 64 common emojis in 8x8 grid
  - _Requirements: 4.2, 4.5_

- [x] 2.2 Implement mobile input event handlers
  - Create memoized event handlers using `useCallback` for input, focus, blur events
  - Implement debounced typing indicator (400ms delay) to reduce network calls
  - Add passive event listeners for scroll and touch events
  - Ensure send button enables/disables based on message length and content
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.3 Add reply and emoji functionality to mobile input
  - Implement reply preview display above textarea (same as desktop)
  - Add cancel reply button
  - Ensure emoji insertion works at cursor position in textarea
  - _Requirements: 10.5_

- [x] 3. Refactor desktop input component
  - Rename current `components/ChatInput.tsx` to `components/ChatInputDesktop.tsx`
  - Ensure all existing functionality is preserved exactly as-is
  - Update imports and exports to match new filename
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.1 Create smart chat input wrapper
  - Create new `components/ChatInput.tsx` that acts as a wrapper component
  - Use `useDevice` hook to determine device type
  - Conditionally render `ChatInputMobile` for mobile devices or `ChatInputDesktop` for desktop
  - Pass through all props to the appropriate component
  - _Requirements: 1.5, 6.2_

- [x] 4. Extract and enhance Pusher connection logic
  - Create `hooks/usePusherConnection.ts` hook to manage Pusher connection lifecycle
  - Move Pusher initialization logic from `app/page.tsx` to the new hook
  - Implement mobile-specific configuration: force WebSocket-only transport on iOS using `enabledTransports: ['ws', 'wss']`
  - Add connection state tracking (connected, connecting, disconnected, failed)
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [x] 4.1 Implement Pusher reconnection logic
  - Add automatic reconnection on visibility change (when tab becomes visible)
  - Implement reconnection on network online event
  - Add exponential backoff for reconnection attempts (1s, 2s, 4s, 8s, max 30s)
  - Unbind and resubscribe to channels on reconnection to avoid missed events
  - _Requirements: 2.3, 2.4, 3.3, 3.4, 3.5_

- [x] 4.2 Add connection state UI indicators
  - Create connection status indicator component in header
  - Display "Connected" (green), "Connecting..." (yellow), "Disconnected" (red) states
  - Add manual reconnect button when in failed state
  - Show offline indicator when network is unavailable
  - _Requirements: 3.3, 8.4_

- [x] 4.3 Add diagnostic logging for Pusher
  - Log connection state changes to console in development mode
  - Log connection errors with detailed error information
  - Add timing metrics for connection establishment
  - Expose connection state through browser developer tools
  - _Requirements: 3.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5. Implement fallback polling mechanism
  - Create `hooks/useMessagePolling.ts` hook for polling-based message updates
  - Implement polling logic that fetches messages using `GET /api/messages?afterTs=<timestamp>`
  - Set polling interval to 3 seconds when active
  - Track last message timestamp to avoid fetching duplicates
  - _Requirements: 2.5_

- [x] 5.1 Add polling activation logic
  - Activate polling only when Pusher connection has been in failed state for >10 seconds
  - Automatically disable polling when Pusher reconnects successfully
  - Prevent duplicate messages by checking message IDs before adding to state
  - Add visual indicator when using fallback polling mode
  - _Requirements: 2.5, 7.4_

- [x] 6. Optimize message sending for mobile
  - Ensure mobile uses cookie-based authentication (already implemented, verify it works)
  - Implement optimistic UI update that displays message immediately on send
  - Add temporary message ID (clientTempId) for tracking optimistic messages
  - Reconcile optimistic message with server response using clientTempId
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6.1 Add message send error handling
  - Remove optimistic message from UI if server returns error or timeout
  - Display toast notification with error message and retry option
  - Store failed message in localStorage for recovery
  - Implement retry logic that resends failed message when user taps retry
  - _Requirements: 7.5, 8.1_

- [x] 7. Implement mobile network resilience
  - Add network status detection using `navigator.onLine` and online/offline events
  - Display persistent offline indicator when network is unavailable
  - Queue outgoing messages in localStorage when offline
  - Automatically send queued messages when network is restored
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7.1 Add request timeout handling
  - Set 10-second timeout for all API requests on mobile
  - Display retry option when requests timeout
  - Implement exponential backoff for retries (1s, 2s, 4s)
  - _Requirements: 8.1_

- [x] 8. Add iOS-specific viewport and keyboard handling
  - Verify existing iOS viewport lock code in `app/page.tsx` works correctly
  - Ensure message list maintains proper padding when keyboard appears
  - Implement auto-scroll to keep input visible when keyboard opens
  - Handle orientation changes and visual viewport resize events
  - _Requirements: 4.4_

- [x] 9. Update message list for mobile optimization
  - Ensure message list scrolling is smooth on mobile (verify existing implementation)
  - Verify lazy loading of images works correctly with `loading="lazy"` attribute
  - Test auto-scroll to bottom behavior on mobile devices
  - Ensure typing indicator displays correctly on mobile
  - _Requirements: 1.3, 10.4_

- [x] 10. Add markdown rendering for mobile messages
  - Create markdown-to-HTML converter function that supports **bold**, *italic*, and links
  - Sanitize markdown output to prevent XSS attacks
  - Apply markdown rendering to messages sent from mobile devices
  - Ensure desktop clients can display mobile markdown messages correctly
  - _Requirements: 4.2, 10.1, 10.2, 10.4_

- [x] 11. Verify backward compatibility
  - Test that desktop clients can receive and display mobile messages correctly
  - Test that mobile clients can receive and display desktop rich text messages
  - Verify message format compatibility in database (no schema changes needed)
  - Ensure reactions, replies, and edits work across mobile and desktop
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Performance testing and optimization
  - Measure input lag on iPhone 12 mini using Chrome DevTools (target: <50ms)
  - Measure message delivery time from send to receive (target: <2s)
  - Test frame rate while typing rapidly (target: >30 FPS)
  - Profile component render times and optimize hot paths
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 9.2, 9.5_

- [x] 13. Manual testing on target devices
  - Test on iPhone 12 mini: typing performance, message updates, keyboard behavior
  - Test on Android device: verify all functionality works correctly
  - Test network resilience: disconnect/reconnect, switch networks, airplane mode
  - Test app backgrounding and foregrounding behavior
  - _Requirements: All requirements_

- [x] 14. Desktop regression testing
  - Verify all existing desktop features work unchanged
  - Test Quill editor functionality: formatting, keyboard shortcuts, links
  - Verify rich text editing, reactions, replies, and message editing
  - Ensure no performance degradation on desktop
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 15. Add feature flag and deployment preparation
  - Add `NEXT_PUBLIC_MOBILE_OPT` environment variable for feature flag
  - Implement feature flag check in ChatInput wrapper component
  - Document rollback procedure in deployment guide
  - Prepare monitoring dashboard for tracking mobile metrics
  - _Requirements: 9.1, 9.4_
