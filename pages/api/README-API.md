# Relay Creation API

To create a new relay, you must create a reservation and invoice in the system.  
You can check the status of the order and the new relay by using the GET /api/invoices/[id] endpoint.
Once the invoice is paid, you can use the NIP86 api to manage your new relay.

## POST /api/invoices

### Parameters

- `relayname` (string): The name of the relay
- `pubkey` (string): The public key of the user
- `topup` (boolean): Whether to top up the relay (if the relay is already active)
- `sats` (number): The amount of sats to pay (only used by topup)
- `referrer` (string): The referrer of the relay

### Response

- `order_id` (string): The ID of the order

### Example

```http
POST /api/invoices?relayname=example&pubkey=00&sats=10&referrer=nobody HTTP/1.1
Host: localhost:3000
```

```json
{
    "order_id": "cm86e3nu50031x724csripd2c"
}
```

## GET /api/invoices/[id]

### Parameters

- `id` (string): The ID of the order

### Response

- `order` (object): The order object
- `order.relay` (object): The relay object

### Example

```http
GET /api/invoices/cm86e3nu50031x724csripd2c HTTP/1.1
Host: localhost:3000
```

```json
{
    "order": {
        "id": "cm86e3nu50031x724csripd2c",
        "amount": 10,
        "paid": false,
        "payment_hash": "xxxx",
        "expires_at": null,
        "lnurl": "lnbc1000.."
        "relay": {
            "id": "cm86e3nu50031x724csripd2c",
            "name": "example",
            "domain": "example.com",
            "created_at": "2023-01-01T00:00:00.000Z"
        }
    }
}
```

# NIP-86 Relay Administration API

This API implements [NIP-86](https://github.com/nostr-protocol/nips/blob/master/86.md) for relay administration. It allows relay owners and moderators to manage relay settings and moderation through a standardized JSON-RPC interface.

## Authentication

All requests must be authenticated using [NIP-98](https://github.com/nostr-protocol/nips/blob/master/98.md) authorization. The request must include:
- HTTP Method: `POST`
- Content-Type: `application/nostr+json+rpc`
- Authorization header with a signed Nostr event (kind 27235)

## Endpoint

```http
POST https://myrelayname.myrelaydomain/
```

## Supported Methods

The following methods are supported:

### General Administration
- `supportedmethods`: Returns list of supported NIP-86 methods
- `changerelaydescription`: Update relay description
- `changerelayicon`: Update relay icon

### Pubkey Management
- `banpubkey`: Ban a pubkey from the relay
- `listbannedpubkeys`: List all banned pubkeys
- `allowpubkey`: Add pubkey to allowlist
- `deleteallowedpubkey`: Remove pubkey from allowlist
- `listallowedpubkeys`: List all allowed pubkeys

### Event Management
- `banevent`: Ban a specific event
- `allowkind`: Allow a specific event kind
- `disallowkind`: Disallow a specific event kind
- `listallowedkinds`: List all allowed event kinds

## Request Format

```json
{
  "method": "<method_name>",
  "params": [<parameters>]
}
```

## Authorization Requirements

- Relay owners have full access to all methods
- Moderators must be explicitly assigned to the relay to access moderation methods
- Authorization is verified against the pubkey in the NIP-98 signed event

## Error Responses

- 401: Unauthorized - Missing or invalid authorization
- 403: Forbidden - Not authorized to manage this relay
- 404: Not Found - Relay not found
- 405: Method Not Allowed - Only POST requests are accepted
- 400: Bad Request - Invalid JSON or missing parameters
