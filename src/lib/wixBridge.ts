// Wix postMessage Bridge
// Handles communication between the React iframe and the Wix parent page via postMessage.

type MessageHandler = (data: any) => void;

const pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (reason: any) => void }>();
const listeners = new Map<string, MessageHandler[]>();

let initialized = false;

function generateRequestId(): string {
  return 'req_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
}

function initBridge() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg.type !== 'string') return;

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
    if (handlers) {
      handlers.forEach((handler) => handler(msg));
    }
  });
}

/**
 * Send a message to the Wix parent and wait for a response.
 * Rejects after `timeout` ms (default 30s).
 */
export function sendMessage<T = any>(type: string, data?: any, timeout = 30000): Promise<T> {
  initBridge();
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
 */
export function onMessage(type: string, handler: MessageHandler): () => void {
  initBridge();
  if (!listeners.has(type)) {
    listeners.set(type, []);
  }
  listeners.get(type)!.push(handler);

  return () => {
    const handlers = listeners.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  };
}
