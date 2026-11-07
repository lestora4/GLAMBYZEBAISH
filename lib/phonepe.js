import crypto from 'crypto';

// ========================================
// PHONEPE CONFIG
// Set PHONEPE_ENV=PRODUCTION when you go live. Defaults to sandbox/UAT.
// ========================================
const IS_PROD = process.env.PHONEPE_ENV === 'PRODUCTION';

const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID || 'PHONEPE_TEST_CLIENT_ID';
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET || 'PHONEPE_TEST_CLIENT_SECRET';
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || '1';

// Auth (OAuth token) and PG (pay / status) live on different hosts in production.
const OAUTH_BASE_URL = IS_PROD
  ? 'https://api.phonepe.com/apis/identity-manager'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const PG_BASE_URL = IS_PROD
  ? 'https://api.phonepe.com/apis/pg'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

// ========================================
// TOKEN CACHE
// Auth tokens are valid for a while; avoid fetching a new one on every request.
// This is in-memory, per server instance — fine for a single Next.js server;
// if you deploy serverless/multi-instance, consider caching in Redis/DB instead.
// ========================================
let cachedToken = null;
let cachedTokenExpiry = 0; // epoch seconds

async function getAuthToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry - 60 > now) {
    return cachedToken;
  }

  const res = await fetch(`${OAUTH_BASE_URL}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: PHONEPE_CLIENT_ID,
      client_version: PHONEPE_CLIENT_VERSION,
      client_secret: PHONEPE_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    console.error('PhonePe auth token error:', data);
    throw new Error('Failed to authenticate with PhonePe');
  }

  cachedToken = data.access_token;
  // PhonePe returns expires_at as epoch seconds in most versions; fall back to 25 min.
  cachedTokenExpiry = data.expires_at || now + 25 * 60;

  return cachedToken;
}

// ========================================
// CREATE PAYMENT (Standard Checkout)
// amount: rupees (will be converted to paise here)
// ========================================
export async function createPhonePeOrder({ merchantOrderId, amount, redirectUrl, metaInfo = {} }) {
  const token = await getAuthToken();

  const payload = {
    merchantOrderId,
    amount: Math.round(amount * 100), // paise
    expireAfter: 1200, // seconds
    metaInfo: {
      udf1: metaInfo.udf1 || '',
      udf2: metaInfo.udf2 || '',
      udf3: metaInfo.udf3 || '',
      udf4: metaInfo.udf4 || '',
      udf5: metaInfo.udf5 || '',
    },
    paymentFlow: {
      type: 'PG_CHECKOUT',
      merchantUrls: {
        redirectUrl,
      },
    },
  };

  const res = await fetch(`${PG_BASE_URL}/checkout/v2/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('PhonePe create order error:', data);
    throw new Error(data.message || 'Failed to create PhonePe order');
  }

  // data: { orderId, state: 'PENDING', expireAt, redirectUrl }
  return data;
}

// ========================================
// CHECK ORDER STATUS
// ========================================
export async function getPhonePeOrderStatus(merchantOrderId) {
  const token = await getAuthToken();

  const res = await fetch(
    `${PG_BASE_URL}/checkout/v2/order/${merchantOrderId}/status?details=false`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error('PhonePe order status error:', data);
    throw new Error(data.message || 'Failed to fetch PhonePe order status');
  }

  // data.state: 'PENDING' | 'COMPLETED' | 'FAILED'
  return data;
}

// ========================================
// WEBHOOK AUTH VERIFICATION
// PhonePe signs the webhook with a username/password you set in the
// PhonePe Business Dashboard (Developer Settings > Webhook). It sends
// Authorization: SHA256(username:password) as a hex digest.
// ========================================
export function verifyPhonePeWebhookAuth(authorizationHeader) {
  if (!authorizationHeader) return false;

  const username = process.env.PHONEPE_WEBHOOK_USERNAME || '';
  const password = process.env.PHONEPE_WEBHOOK_PASSWORD || '';

  const expected = crypto
    .createHash('sha256')
    .update(`${username}:${password}`)
    .digest('hex');

  // Some PhonePe accounts send it as "SHA256(username:password)" directly,
  // others prefix it. Compare case-insensitively against the raw hash.
  return authorizationHeader.trim().toLowerCase() === expected.toLowerCase();
}

// Maps PhonePe's order state to your existing PaymentStatus enum.
export function mapPhonePeStateToPaymentStatus(state) {
  switch (state) {
    case 'COMPLETED':
      return 'PAID';
    case 'FAILED':
      return 'FAILED';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}
