// Wix postMessage Bridge
// Handles communication between the React iframe and the Wix parent page via postMessage.
// The bridge initializes EAGERLY on module load so no messages from Velo are ever missed.

type MessageHandler = (data: any) => void;

const pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (reason: any) => void }>();
const listeners = new Map<string, MessageHandler[]>();

// Buffer: stores the LAST message received per type BEFORE any listener was registered.
// When a listener is first registered for a type, it immediately receives the buffered message.
const earlyMessages = new Map<string, any>();

function generateRequestId(): string {
  return 'req_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
}

function handleIncomingMessage(msg: any) {
  if (!msg || typeof msg.type !== 'string') return;

  console.log('[wixBridge] Received message:', { type: msg.type, hasRequestId: !!msg.requestId });

  // Match pending request by requestId
  if (msg.requestId && pendingRequests.has(msg.requestId)) {
    const { resolve, reject } = pendingRequests.get(msg.requestId)!;
    pendingRequests.delete(msg.requestId);
    if (msg.success === false) {
      reject(new Error(msg.error || 'Unknown error from Wix'));
    } else {
      resolve(msg.data);
    }
  }

  // Notify registered listeners
  const handlers = listeners.get(msg.type);
  if (handlers && handlers.length > 0) {
    console.log(`[wixBridge] Notifying ${handlers.length} listener(s) for type: ${msg.type}`);
    handlers.forEach((handler) => handler(msg));
  } else {
    // No listener yet – buffer the message so a future listener gets it immediately
    console.log(`[wixBridge] No listener for ${msg.type} yet, buffering message`);
    earlyMessages.set(msg.type, msg);
  }
}

// ── Eager initialization: start listening immediately on module load ──
console.log('[wixBridge] Bridge initialized eagerly, listening for postMessage events');
window.addEventListener('message', (event) => handleIncomingMessage(event.data));

/**
 * Send a message to the Wix parent and wait for a response.
 * Rejects after `timeout` ms (default 30s).
 */
export function sendMessage<T = any>(type: string, data?: any, timeout = 30000): Promise<T> {
  const requestId = generateRequestId();

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Timeout waiting for response to ${type}`));
    }, timeout);

    pendingRequests.set(requestId, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (reason) => {
        clearTimeout(timer);
        reject(reason);
      },
    });

    window.parent.postMessage({ type, requestId, data }, '*');
  });
}

/**
 * Listen for a specific message type from Wix (e.g. PAYMENT_CANCELLED).
 * Returns an unsubscribe function.
 *
 * If a message of this type was already received before the listener was
 * registered, the handler is invoked immediately with the buffered message.
 */
export function onMessage(type: string, handler: MessageHandler): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, []);
  }
  listeners.get(type)!.push(handler);

  // Replay buffered message if one arrived before this listener was registered
  if (earlyMessages.has(type)) {
    const buffered = earlyMessages.get(type);
    earlyMessages.delete(type);
    console.log(`[wixBridge] Replaying buffered ${type} message to new listener`);
    // Defer to next microtick so caller can finish setup
    Promise.resolve().then(() => handler(buffered));
  }

  return () => {
    const handlers = listeners.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  };
}

/**
 * Convenience helper for Velo-initiated INIT_EVENT_DATA messages.
 * The handler receives the inner payload object.
 */
export function onVeloInit(handler: (payload: any) => void): () => void {
  return onMessage('INIT_EVENT_DATA', (msg) => {
    const payload = (msg as any)?.payload ?? (msg as any)?.data ?? msg;
    handler(payload);
  });
}
