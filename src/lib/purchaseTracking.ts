import type { TicketInfo, TicketSelection } from '@/types/order';

// ── Types ────────────────────────────────────────────────────────────

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  item_category: string;
  item_variant: string;
  price: number;
  quantity: number;
}

export interface PurchaseContext {
  orderNumber: string;
  totalAmount: number;
  currency: string;
  items: PurchaseItem[];
}

// ── localStorage keys ────────────────────────────────────────────────

const SENT_PURCHASES_KEY = 'sentPurchaseIds';
const PURCHASE_CONTEXT_KEY = 'purchaseContext';

// ── Dedup helpers ─────────────────────────────────────────────────────

function getSentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_PURCHASES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSent(transactionId: string): void {
  try {
    const ids = getSentIds();
    ids.add(transactionId);
    // Cap stored IDs to avoid unbounded growth
    const arr = Array.from(ids).slice(-30);
    localStorage.setItem(SENT_PURCHASES_KEY, JSON.stringify(arr));
  } catch { /* localStorage may be unavailable */ }
}

// ── Payload builders ──────────────────────────────────────────────────

/** Map ticket selections to GA4 ecommerce items array */
export function buildPurchaseItems(
  selections: TicketSelection[],
  tickets: TicketInfo[]
): PurchaseItem[] {
  return selections
    .filter((s) => s.quantity > 0)
    .map((s) => {
      const ticket = tickets.find((t) => t.type === s.type);
      return {
        item_id: ticket?.wixId || s.type,
        item_name: ticket?.name || s.type,
        item_category: 'Event Ticket',
        item_variant: ticket?.type || s.type,
        price: ticket?.price ?? 0,
        quantity: s.quantity,
      };
    });
}

/** Heuristic: new vs returning based on prior purchase marker */
function getUserType(): 'new' | 'returning' {
  try {
    return localStorage.getItem('hasPurchased') === 'true' ? 'returning' : 'new';
  } catch {
    return 'new';
  }
}

/**
 * Try to extract a traffic source value.
 * Looks at UTM params on the current iframe URL first, then the referrer URL.
 * In cross-origin iframe contexts, window.parent.location is not accessible,
 * so we rely on what is readable from within the iframe.
 */
function getTrafficSource(): string | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source');
    if (utm) return utm;

    if (document.referrer) {
      const ref = new URL(document.referrer);
      const refUtm = ref.searchParams.get('utm_source');
      if (refUtm) return refUtm;
      const host = ref.hostname.replace(/^www\./, '');
      if (host) return host;
    }
  } catch { /* cross-origin or parse error – omit gracefully */ }
  return undefined;
}

// ── Main push function ────────────────────────────────────────────────

/**
 * Push a GA4-compatible purchase event to the parent window's dataLayer.
 * GTM is loaded on the parent Wix page, not inside this iframe, so we
 * target window.parent. Returns true if the push was actually performed,
 * false if skipped due to dedup.
 */
export function pushPurchaseDataLayer(context: PurchaseContext): boolean {
  const { orderNumber, totalAmount, currency, items } = context;

  // --- Dedup: each transaction_id must be pushed exactly once ---
  if (getSentIds().has(orderNumber)) {
    console.log('[purchaseTracking] Already sent purchase for', orderNumber, '– skipping');
    return false;
  }

  const numItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const userType = getUserType();
  const trafficSource = getTrafficSource();

  const ecommerce: Record<string, unknown> = {
    transaction_id: orderNumber,
    value: totalAmount,
    currency: currency || 'ILS',
    payment_type: 'Meshulam',
    num_items: numItems,
    user_type: userType,
    items,
  };

  if (trafficSource) {
    ecommerce.traffic_source = trafficSource;
  }

  const payload = { event: 'purchase', ecommerce };

  try {
    // Push to parent window where GTM lives. Fall back to own window in dev/preview.
    const target: Window = window.parent !== window ? window.parent : window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (target as any).dataLayer = (target as any).dataLayer || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (target as any).dataLayer.push(payload);
    console.log('[purchaseTracking] dataLayer.push sent', payload);

    markSent(orderNumber);
    // Mark this browser as a returning buyer for next sessions
    try { localStorage.setItem('hasPurchased', 'true'); } catch { /* */ }
    return true;
  } catch (err) {
    console.error('[purchaseTracking] dataLayer.push failed', err);
    return false;
  }
}

// ── Context persistence (for pending → paid recovery across sessions) ─

/**
 * Persist purchase context keyed by orderNumber so that if the browser
 * is closed during "pending" state and the user returns, we still have
 * the full item breakdown for the dataLayer push.
 */
export function savePurchaseContext(context: PurchaseContext): void {
  try {
    localStorage.setItem(PURCHASE_CONTEXT_KEY, JSON.stringify(context));
  } catch { /* */ }
}

/**
 * Retrieve persisted purchase context. Only returns a match if the
 * stored orderNumber equals the requested one.
 */
export function loadPurchaseContext(orderNumber: string): PurchaseContext | null {
  try {
    const raw = localStorage.getItem(PURCHASE_CONTEXT_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as PurchaseContext;
    return ctx.orderNumber === orderNumber ? ctx : null;
  } catch {
    return null;
  }
}

export function clearPurchaseContext(): void {
  try { localStorage.removeItem(PURCHASE_CONTEXT_KEY); } catch { /* */ }
}
