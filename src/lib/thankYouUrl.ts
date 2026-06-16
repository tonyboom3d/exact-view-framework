const THANK_YOU_PARAM = 'thank-you-page';

export function getThankYouOrderFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(THANK_YOU_PARAM);
}

export function setThankYouUrl(orderNumber: string): void {
  if (typeof window === 'undefined' || !orderNumber) return;
  const url = new URL(window.location.href);
  url.searchParams.set(THANK_YOU_PARAM, orderNumber);
  window.history.replaceState({}, '', url.toString());
}

export function clearThankYouUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(THANK_YOU_PARAM);
  window.history.replaceState({}, '', url.toString());
}
