/**
 * Kindred Storage Layer (storage.js)
 * High-performance persistence abstraction supporting:
 * 1. Upstash Redis / Vercel KV via REST API (zero native dependencies, uses native global fetch)
 * 2. In-memory fallback with transparent lifecycle logging
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || null;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || null;

const isRemoteAvailable = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

if (!isRemoteAvailable) {
  // Visible server-side warning as requested by specs
  console.warn('[Kindred Storage Warning] Neither UPSTASH_REDIS_REST_URL nor KV_REST_API_URL is configured. Operating with in-memory storage fallback. Messages and suppressions will persist during serverless instance lifetime.');
}

// Global in-memory storage fallback
const memoryStore = {
  messages: [], // Array of message records
  suppressions: new Map(), // phone -> { phone, reason, suppressedAt }
  rateLimits: new Map(), // ip:windowKey -> count
  dailySendCounts: new Map() // dateStr -> count
};

// Seed initial demo suppression (matches front-end prototype test state: 1 contact opted out)
memoryStore.suppressions.set('+15550198', {
  phone: '+15550198',
  reason: 'Simulated customer opt-out via STOP',
  suppressedAt: new Date(Date.now() - 86400000).toISOString()
});

/**
 * Execute an Upstash Redis REST command
 */
async function redisCommand(command, ...args) {
  if (!isRemoteAvailable) return null;
  try {
    const url = `${UPSTASH_URL.replace(/\/$/, '')}/${[command, ...args].map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      console.error(`[Kindred Redis Error] Status ${res.status}: ${res.statusText}`);
      return null;
    }
    const json = await res.json();
    return json.result;
  } catch (err) {
    console.error('[Kindred Redis Request Failed]', err.message);
    return null;
  }
}

/**
 * Record a new sent or inbound message
 */
async function saveMessage(msg) {
  const record = {
    id: msg.id || msg.sid || `msg_${Date.now()}`,
    sid: msg.sid || msg.id || null,
    direction: msg.direction || 'outbound', // 'outbound' or 'inbound'
    channel: msg.channel || 'sms',
    to: msg.to || null,
    from: msg.from || null,
    body: msg.body || '',
    segments: msg.segments || 1,
    status: msg.status || 'queued', // queued, sent, delivered, undelivered, failed, received
    errorCode: msg.errorCode || null,
    errorMessage: msg.errorMessage || null,
    estimatedCostUsd: msg.estimatedCostUsd || '0.013',
    timestamp: msg.timestamp || new Date().toISOString(),
    mock: Boolean(msg.mock)
  };

  // 1. Update In-Memory
  const existingIdx = memoryStore.messages.findIndex(m => m.sid === record.sid || m.id === record.id);
  if (existingIdx >= 0) {
    memoryStore.messages[existingIdx] = { ...memoryStore.messages[existingIdx], ...record };
  } else {
    memoryStore.messages.unshift(record);
    if (memoryStore.messages.length > 200) {
      memoryStore.messages = memoryStore.messages.slice(0, 200);
    }
  }

  // 2. Persist to Redis / KV if configured
  if (isRemoteAvailable) {
    try {
      await redisCommand('LPUSH', 'kindred:messages', JSON.stringify(record));
      await redisCommand('LTRIM', 'kindred:messages', '0', '199');
    } catch (e) {
      console.warn('[Kindred Storage] Could not persist message to remote store:', e.message);
    }
  }

  return record;
}

/**
 * Update message status (e.g. from Twilio Status Callback webhook)
 */
async function updateMessageStatus(sid, status, errorCode = null, errorMessage = null) {
  if (!sid) return null;

  let found = null;
  // Update in-memory
  const msg = memoryStore.messages.find(m => m.sid === sid);
  if (msg) {
    msg.status = status;
    if (errorCode) msg.errorCode = errorCode;
    if (errorMessage) msg.errorMessage = errorMessage;
    msg.updatedAt = new Date().toISOString();
    found = msg;
  }

  // If remote KV is available, we could sync or overwrite
  if (isRemoteAvailable) {
    try {
      const rawList = await redisCommand('LRANGE', 'kindred:messages', '0', '99');
      if (Array.isArray(rawList)) {
        for (let i = 0; i < rawList.length; i++) {
          try {
            const item = typeof rawList[i] === 'string' ? JSON.parse(rawList[i]) : rawList[i];
            if (item && item.sid === sid) {
              item.status = status;
              if (errorCode) item.errorCode = errorCode;
              if (errorMessage) item.errorMessage = errorMessage;
              item.updatedAt = new Date().toISOString();
              await redisCommand('LSET', 'kindred:messages', i.toString(), JSON.stringify(item));
              found = item;
              break;
            }
          } catch (parseErr) {}
        }
      }
    } catch (e) {
      console.warn('[Kindred Storage] Could not update remote status:', e.message);
    }
  }

  return found;
}

/**
 * Retrieve recent messages
 */
async function getMessages(limit = 50, filterTo = null) {
  let list = memoryStore.messages;

  if (isRemoteAvailable) {
    try {
      const rawList = await redisCommand('LRANGE', 'kindred:messages', '0', (limit - 1).toString());
      if (Array.isArray(rawList) && rawList.length > 0) {
        list = rawList.map(item => typeof item === 'string' ? JSON.parse(item) : item);
      }
    } catch (e) {
      console.warn('[Kindred Storage] Fallback to memory messages:', e.message);
    }
  }

  if (filterTo) {
    list = list.filter(m => m.to === filterTo || m.from === filterTo);
  }

  return list.slice(0, limit);
}

/**
 * Suppression List Management (STOP / START opt-outs)
 */
async function isSuppressed(phone) {
  if (!phone) return false;
  const norm = phone.trim();

  if (isRemoteAvailable) {
    try {
      const res = await redisCommand('SISMEMBER', 'kindred:suppressions', norm);
      if (res === 1 || res === '1') return true;
    } catch (e) {}
  }

  return memoryStore.suppressions.has(norm);
}

async function addSuppression(phone, reason = 'User requested STOP opt-out') {
  if (!phone) return;
  const norm = phone.trim();
  const entry = {
    phone: norm,
    reason,
    suppressedAt: new Date().toISOString()
  };

  memoryStore.suppressions.set(norm, entry);

  if (isRemoteAvailable) {
    try {
      await redisCommand('SADD', 'kindred:suppressions', norm);
    } catch (e) {}
  }

  return entry;
}

async function removeSuppression(phone) {
  if (!phone) return;
  const norm = phone.trim();
  memoryStore.suppressions.delete(norm);

  if (isRemoteAvailable) {
    try {
      await redisCommand('SREM', 'kindred:suppressions', norm);
    } catch (e) {}
  }

  return true;
}

async function getSuppressionList() {
  if (isRemoteAvailable) {
    try {
      const members = await redisCommand('SMEMBERS', 'kindred:suppressions');
      if (Array.isArray(members)) {
        return members.map(phone => ({
          phone,
          reason: 'Opted out via STOP',
          suppressedAt: new Date().toISOString()
        }));
      }
    } catch (e) {}
  }

  return Array.from(memoryStore.suppressions.values());
}

/**
 * Rate Limiting: Max 5 test messages per minute per IP
 */
async function checkIpRateLimit(ip, maxPerMinute = 5) {
  const safeIp = ip || '127.0.0.1';
  const nowMinute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${safeIp}:${nowMinute}`;

  let currentCount = 0;

  if (isRemoteAvailable) {
    try {
      currentCount = await redisCommand('INCR', key);
      if (currentCount === 1) {
        await redisCommand('EXPIRE', key, '90');
      }
    } catch (e) {
      currentCount = (memoryStore.rateLimits.get(key) || 0) + 1;
      memoryStore.rateLimits.set(key, currentCount);
    }
  } else {
    currentCount = (memoryStore.rateLimits.get(key) || 0) + 1;
    memoryStore.rateLimits.set(key, currentCount);
  }

  return {
    allowed: currentCount <= maxPerMinute,
    count: currentCount,
    limit: maxPerMinute,
    remaining: Math.max(0, maxPerMinute - currentCount)
  };
}

/**
 * Daily Test Send Cap: Max test messages per day across application
 */
async function checkDailyCap(maxCap = 50) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const key = `kindred:daily_sends:${todayStr}`;

  let currentCount = 0;

  if (isRemoteAvailable) {
    try {
      currentCount = await redisCommand('INCR', key);
      if (currentCount === 1) {
        await redisCommand('EXPIRE', key, '172800'); // 48 hours TTL
      }
    } catch (e) {
      currentCount = (memoryStore.dailySendCounts.get(todayStr) || 0) + 1;
      memoryStore.dailySendCounts.set(todayStr, currentCount);
    }
  } else {
    currentCount = (memoryStore.dailySendCounts.get(todayStr) || 0) + 1;
    memoryStore.dailySendCounts.set(todayStr, currentCount);
  }

  return {
    allowed: currentCount <= maxCap,
    count: currentCount,
    cap: maxCap,
    remaining: Math.max(0, maxCap - currentCount)
  };
}

module.exports = {
  isRemoteAvailable,
  saveMessage,
  updateMessageStatus,
  getMessages,
  isSuppressed,
  addSuppression,
  removeSuppression,
  getSuppressionList,
  checkIpRateLimit,
  checkDailyCap
};
