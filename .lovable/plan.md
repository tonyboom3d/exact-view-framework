

# Integration: Wix Events via postMessage

## Overview
The React app (embedded as an iframe in Wix) will communicate with Wix Velo through `window.parent.postMessage`. A centralized messaging layer will handle all outgoing commands and incoming responses, with loading states shown to the user while waiting for Wix backend operations.

## Communication Architecture

The app will be embedded inside a Wix page via an HTML iframe component. All communication flows through `postMessage`:

- **Outgoing (React to Wix)**: Commands like "fetch tickets", "create order", "open payment"
- **Incoming (Wix to React)**: Responses with ticket data, payment results, order confirmations

Each message will have a `type` field and a unique `requestId` for matching responses to requests.

## Message Protocol

### 1. Fetch Tickets (App Load)

**Out (React to Wix):**
```text
{
  type: "GET_TICKETS",
  requestId: "req_xxx"
}
```

**In (Wix to React):**
```text
{
  type: "GET_TICKETS_RESPONSE",
  requestId: "req_xxx",
  success: true,
  data: {
    tickets: [
      {
        _id: "wix-ticket-id-123",
        name: "General Admission",
        price: 2900,
        description: "...",
        soldOut: false,
        soldPercent: 73,
        color: "...",
        progressColor: "...",
        mapLabel: "..."
      },
      ...
    ]
  }
}
```

The UI will show a skeleton/spinner on Step 1 until this data arrives. The ticket `_id` from Wix will be stored alongside each ticket type.

### 2. Submit Order Details (Proceed to Payment)

When the user clicks "Move to Payment", the app sends all collected data:

**Out (React to Wix):**
```text
{
  type: "CREATE_ORDER",
  requestId: "req_xxx",
  data: {
    tickets: [
      { ticketId: "wix-ticket-id-123", quantity: 2 }
    ],
    guests: [
      { firstName: "...", lastName: "...", phone: "...", email: "..." },
      { firstName: "...", lastName: "...", phone: "..." }
    ],
    payer: {                          // Only if "different payer" was checked
      firstName: "...",
      lastName: "...",
      phone: "...",
      email: "..."
    },
    companyName: "..."                // Optional
  }
}
```

**In (Wix to React):**
```text
{
  type: "CREATE_ORDER_RESPONSE",
  requestId: "req_xxx",
  success: true,
  data: {
    orderId: "wix-order-id",
    paymentToken: "..."              // Token for Wix Pay
  }
}
```

### 3. Open Wix Pay

After receiving the order response, the app tells Wix to open its native payment dialog:

**Out (React to Wix):**
```text
{
  type: "OPEN_PAYMENT",
  requestId: "req_xxx",
  data: {
    orderId: "wix-order-id",
    paymentToken: "...",
    amount: 5800,
    buyerInfo: {
      firstName: "...",
      lastName: "...",
      phone: "...",
      email: "..."
    }
  }
}
```

**In (Wix to React) - Success:**
```text
{
  type: "PAYMENT_RESULT",
  requestId: "req_xxx",
  success: true,
  data: {
    orderNumber: "ORD-12345",
    referralCode: "REF-ABCDE"
  }
}
```

**In (Wix to React) - Failure:**
```text
{
  type: "PAYMENT_RESULT",
  requestId: "req_xxx",
  success: false,
  error: "Payment declined"
}
```

**In (Wix to React) - Cancelled:**
```text
{
  type: "PAYMENT_CANCELLED",
  requestId: "req_xxx"
}
```

## UI Changes

### Loading States
A full-screen overlay spinner will appear during:
- Initial ticket loading (Step 1)
- Order creation (after clicking "Move to Payment")
- Payment processing (after Wix Pay closes, waiting for Velo confirmation)

### Error Handling
- Payment errors: Show a toast with the error message, keep user on Step 2
- Payment cancelled: Close overlay, keep user on Step 2
- Network/timeout errors: Show toast with retry option

### Flow Changes
- **Step 1**: Tickets are fetched from Wix instead of using hardcoded `TICKETS` array. Skeleton cards shown while loading.
- **Step 2**: No changes to the form UI, but the selected Wix ticket `_id` is tracked.
- **Payment**: The demo `PaymentDialog` is removed. Instead, clicking "Move to Payment" triggers `CREATE_ORDER` then `OPEN_PAYMENT` (Wix Pay opens natively outside the iframe).
- **Step 3 (Thank You)**: Only shown after Wix confirms a successful payment and order creation. Order number and referral code come from Wix.

## Technical Implementation

### New Files

1. **`src/lib/wixBridge.ts`** - Centralized postMessage handler:
   - `sendMessage(type, data)` - sends message with auto-generated requestId, returns a Promise
   - `onMessage(type, callback)` - registers listener for incoming messages
   - Timeout handling (e.g., 30 seconds) with rejection
   - Message queue for unmatched responses

2. **`src/hooks/useWixTickets.ts`** - Hook that fetches tickets on mount via the bridge, returns `{ tickets, loading, error }`

3. **`src/hooks/useWixPayment.ts`** - Hook exposing `{ createOrderAndPay, loading, error }` that orchestrates the CREATE_ORDER + OPEN_PAYMENT flow

### Modified Files

4. **`src/types/order.ts`**:
   - Add `wixId: string` to `TicketInfo`
   - Remove hardcoded `TICKETS` array (tickets will come from Wix)
   - Add message type interfaces

5. **`src/pages/Index.tsx`**:
   - Use `useWixTickets()` to load tickets dynamically
   - Use `useWixPayment()` for the payment flow
   - Add loading overlay component
   - Remove `PaymentDialog` usage
   - Pass Wix-sourced order number / referral code to ThankYou

6. **`src/components/TicketSelection.tsx`**:
   - Accept tickets as prop instead of importing `TICKETS`
   - Show skeleton cards while loading

7. **`src/components/BuyerDetails.tsx`**:
   - Accept tickets as prop instead of importing `TICKETS`

8. **`src/components/ThankYou.tsx`**:
   - Accept tickets as prop instead of importing `TICKETS`

9. **`src/components/PaymentDialog.tsx`** - Will be removed (Wix Pay replaces it)

10. **`src/components/LoadingOverlay.tsx`** (new) - Full-screen spinner overlay with a message prop (e.g., "Creating order...", "Processing payment...")

