/** Set to true when ticket sales should be closed (event has started). */
export const TICKET_SALES_CLOSED = true;

export function isTicketSalesClosed(): boolean {
  return TICKET_SALES_CLOSED;
}
