/**
 * Kindred SMS Utilities (sms-utils.js)
 * GSM-7 / UCS-2 character classification, segment calculation,
 * US E.164 phone validation, timezone quiet-hours analysis, and cost estimation.
 */

// Standard GSM 03.38 7-bit alphabet (160 characters in single segment)
const GSM_7_BASIC = new Set([
  '@', '£', '$', '¥', 'è', 'é', 'ù', 'ì', 'ò', 'Ç', '\n', 'Ø', 'ø', '\r', 'Å', 'å',
  'Δ', '_', 'Φ', 'Γ', 'Λ', 'Ω', 'Π', 'Ψ', 'Σ', 'Θ', 'Ξ', '\x1b', 'Æ', 'æ', 'ß', 'É',
  ' ', '!', '"', '#', '¤', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
  '¡', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ñ', 'Ü', '§',
  '¿', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ä', 'ö', 'ñ', 'ü', 'à'
]);

// GSM 7-bit extension characters (each counts as 2 characters in length)
const GSM_7_EXTENSION = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€']);

/**
 * Normalizes input string to US E.164 format (+1XXXXXXXXXX).
 * Accepts: "+12025550143", "12025550143", "2025550143", "(202) 555-0143", etc.
 */
function normalizeUsPhone(input) {
  if (!input || typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (input.startsWith('+1') && digits.length === 11) {
    return `+${digits}`;
  }
  return null;
}

/**
 * Validates whether a phone number is a valid US E.164 number (+1XXXXXXXXXX).
 */
function isValidUsE164(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // US numbers: +1 followed by 10 digits; area code must not start with 0 or 1
  return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone);
}

/**
 * Analyzes text encoding and calculates message segments according to SMS carrier rules.
 * Max allowed segments: 3.
 */
function analyzeSmsContent(text) {
  if (!text || typeof text !== 'string') {
    return {
      chars: 0,
      segments: 0,
      remaining: 160,
      encoding: 'GSM-7',
      isGsm7: true,
      hasNonGsmChars: false,
      nonGsmChars: [],
      maxSegmentsExceeded: false
    };
  }

  let isGsm7 = true;
  let gsmLength = 0;
  const nonGsmChars = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (GSM_7_BASIC.has(char)) {
      gsmLength += 1;
    } else if (GSM_7_EXTENSION.has(char)) {
      gsmLength += 2;
    } else {
      isGsm7 = false;
      if (!nonGsmChars.includes(char)) {
        nonGsmChars.push(char);
      }
    }
  }

  let segments = 0;
  let remaining = 0;
  const chars = isGsm7 ? gsmLength : text.length;
  const encoding = isGsm7 ? 'GSM-7' : 'UCS-2';

  if (isGsm7) {
    if (chars === 0) {
      segments = 0;
      remaining = 160;
    } else if (chars <= 160) {
      segments = 1;
      remaining = 160 - chars;
    } else {
      segments = Math.ceil(chars / 153);
      remaining = segments * 153 - chars;
    }
  } else {
    // UCS-2 (contains emoji or non-GSM characters)
    if (chars === 0) {
      segments = 0;
      remaining = 70;
    } else if (chars <= 70) {
      segments = 1;
      remaining = 70 - chars;
    } else {
      segments = Math.ceil(chars / 67);
      remaining = segments * 67 - chars;
    }
  }

  return {
    chars,
    segments,
    remaining,
    encoding,
    isGsm7,
    hasNonGsmChars: !isGsm7,
    nonGsmChars,
    maxSegmentsExceeded: segments > 3
  };
}

/**
 * Ensures mandatory opt-out instructions are included in the message body.
 */
function ensureOptOutLanguage(text) {
  const trimmed = (text || '').trim();
  const hasStop = /\bstop\b/i.test(trimmed);
  if (hasStop) {
    return {
      body: trimmed,
      appended: false
    };
  }
  const suffix = ' (Reply STOP to opt out)';
  return {
    body: `${trimmed}${suffix}`,
    appended: true
  };
}

/**
 * Calculates estimated cost for sending test SMS (Twilio fee + carrier pass-through).
 * Twilio base: $0.0083/segment
 * Carrier surcharge: $0.0035 - $0.0050/segment
 * Total: ~$0.012 - $0.013/segment
 */
function calculateEstimatedCost(segments) {
  const count = Math.max(1, segments || 1);
  const baseRate = 0.0083;
  const carrierFeeLow = 0.0035;
  const carrierFeeHigh = 0.0050;

  const low = (count * (baseRate + carrierFeeLow)).toFixed(4);
  const high = (count * (baseRate + carrierFeeHigh)).toFixed(4);
  const mid = (count * (baseRate + (carrierFeeLow + carrierFeeHigh) / 2)).toFixed(3);

  return {
    segments: count,
    twilioBaseUsd: (count * baseRate).toFixed(4),
    carrierFeeUsd: `${(count * carrierFeeLow).toFixed(4)} - ${(count * carrierFeeHigh).toFixed(4)}`,
    estimatedCostUsd: mid,
    rangeUsd: `$${low} - $${high}`,
    displayString: `~$${mid} ($0.012–$0.013/segment incl. carrier fee)`
  };
}

/**
 * US Area Code to Time Zone mapping (sample lookup for major US metro area codes).
 * Defaults to America/New_York if area code is unmapped.
 */
const AREA_CODE_TIMEZONES = {
  // Eastern
  '201': 'America/New_York', '202': 'America/New_York', '203': 'America/New_York',
  '207': 'America/New_York', '212': 'America/New_York', '215': 'America/New_York',
  '216': 'America/New_York', '239': 'America/New_York', '240': 'America/New_York',
  '301': 'America/New_York', '302': 'America/New_York', '305': 'America/New_York',
  '315': 'America/New_York', '321': 'America/New_York', '330': 'America/New_York',
  '347': 'America/New_York', '352': 'America/New_York', '401': 'America/New_York',
  '404': 'America/New_York', '407': 'America/New_York', '410': 'America/New_York',
  '412': 'America/New_York', '434': 'America/New_York', '443': 'America/New_York',
  '470': 'America/New_York', '475': 'America/New_York', '484': 'America/New_York',
  '508': 'America/New_York', '516': 'America/New_York', '518': 'America/New_York',
  '540': 'America/New_York', '561': 'America/New_York', '570': 'America/New_York',
  '571': 'America/New_York', '585': 'America/New_York', '603': 'America/New_York',
  '609': 'America/New_York', '610': 'America/New_York', '617': 'America/New_York',
  '646': 'America/New_York', '678': 'America/New_York', '703': 'America/New_York',
  '704': 'America/New_York', '716': 'America/New_York', '718': 'America/New_York',
  '727': 'America/New_York', '732': 'America/New_York', '754': 'America/New_York',
  '757': 'America/New_York', '770': 'America/New_York', '774': 'America/New_York',
  '781': 'America/New_York', '786': 'America/New_York', '804': 'America/New_York',
  '813': 'America/New_York', '814': 'America/New_York', '828': 'America/New_York',
  '845': 'America/New_York', '848': 'America/New_York', '856': 'America/New_York',
  '857': 'America/New_York', '860': 'America/New_York', '862': 'America/New_York',
  '908': 'America/New_York', '910': 'America/New_York', '914': 'America/New_York',
  '917': 'America/New_York', '919': 'America/New_York', '929': 'America/New_York',
  '941': 'America/New_York', '954': 'America/New_York', '973': 'America/New_York',
  '978': 'America/New_York', '980': 'America/New_York',

  // Central
  '205': 'America/Chicago', '210': 'America/Chicago', '214': 'America/Chicago',
  '217': 'America/Chicago', '219': 'America/Chicago', '224': 'America/Chicago',
  '225': 'America/Chicago', '228': 'America/Chicago', '251': 'America/Chicago',
  '254': 'America/Chicago', '256': 'America/Chicago', '262': 'America/Chicago',
  '281': 'America/Chicago', '309': 'America/Chicago', '312': 'America/Chicago',
  '314': 'America/Chicago', '316': 'America/Chicago', '318': 'America/Chicago',
  '319': 'America/Chicago', '334': 'America/Chicago', '361': 'America/Chicago',
  '402': 'America/Chicago', '405': 'America/Chicago', '409': 'America/Chicago',
  '414': 'America/Chicago', '417': 'America/Chicago', '469': 'America/Chicago',
  '479': 'America/Chicago', '501': 'America/Chicago', '504': 'America/Chicago',
  '507': 'America/Chicago', '512': 'America/Chicago', '515': 'America/Chicago',
  '563': 'America/Chicago', '573': 'America/Chicago', '601': 'America/Chicago',
  '608': 'America/Chicago', '612': 'America/Chicago', '615': 'America/Chicago',
  '618': 'America/Chicago', '630': 'America/Chicago', '636': 'America/Chicago',
  '651': 'America/Chicago', '662': 'America/Chicago', '701': 'America/Chicago',
  '708': 'America/Chicago', '712': 'America/Chicago', '713': 'America/Chicago',
  '715': 'America/Chicago', '731': 'America/Chicago', '763': 'America/Chicago',
  '769': 'America/Chicago', '773': 'America/Chicago', '815': 'America/Chicago',
  '816': 'America/Chicago', '817': 'America/Chicago', '830': 'America/Chicago',
  '832': 'America/Chicago', '847': 'America/Chicago', '901': 'America/Chicago',
  '903': 'America/Chicago', '913': 'America/Chicago', '918': 'America/Chicago',
  '920': 'America/Chicago', '931': 'America/Chicago', '936': 'America/Chicago',
  '940': 'America/Chicago', '952': 'America/Chicago', '956': 'America/Chicago',
  '972': 'America/Chicago', '979': 'America/Chicago',

  // Mountain
  '303': 'America/Denver', '307': 'America/Denver', '385': 'America/Denver',
  '406': 'America/Denver', '435': 'America/Denver', '480': 'America/Phoenix',
  '505': 'America/Denver', '520': 'America/Phoenix', '575': 'America/Denver',
  '602': 'America/Phoenix', '623': 'America/Phoenix', '719': 'America/Denver',
  '720': 'America/Denver', '801': 'America/Denver', '928': 'America/Phoenix',
  '970': 'America/Denver',

  // Pacific
  '206': 'America/Los_Angeles', '209': 'America/Los_Angeles', '213': 'America/Los_Angeles',
  '253': 'America/Los_Angeles', '310': 'America/Los_Angeles', '323': 'America/Los_Angeles',
  '360': 'America/Los_Angeles', '408': 'America/Los_Angeles', '415': 'America/Los_Angeles',
  '425': 'America/Los_Angeles', '442': 'America/Los_Angeles', '503': 'America/Los_Angeles',
  '509': 'America/Los_Angeles', '510': 'America/Los_Angeles', '530': 'America/Los_Angeles',
  '541': 'America/Los_Angeles', '559': 'America/Los_Angeles', '562': 'America/Los_Angeles',
  '619': 'America/Los_Angeles', '626': 'America/Los_Angeles', '628': 'America/Los_Angeles',
  '650': 'America/Los_Angeles', '657': 'America/Los_Angeles', '661': 'America/Los_Angeles',
  '702': 'America/Los_Angeles', '707': 'America/Los_Angeles', '714': 'America/Los_Angeles',
  '725': 'America/Los_Angeles', '747': 'America/Los_Angeles', '760': 'America/Los_Angeles',
  '775': 'America/Los_Angeles', '805': 'America/Los_Angeles', '818': 'America/Los_Angeles',
  '831': 'America/Los_Angeles', '858': 'America/Los_Angeles', '909': 'America/Los_Angeles',
  '916': 'America/Los_Angeles', '925': 'America/Los_Angeles', '949': 'America/Los_Angeles',
  '951': 'America/Los_Angeles', '971': 'America/Los_Angeles',

  // Alaska & Hawaii
  '907': 'America/Anchorage',
  '808': 'Pacific/Honolulu'
};

/**
 * Checks whether the current time is within recipient quiet hours.
 * Standard TCPA / state compliance: 8:00 PM to 8:00 AM (or 9:00 AM) recipient local time.
 */
function checkRecipientQuietHours(phone, now = new Date()) {
  const norm = normalizeUsPhone(phone);
  if (!norm) {
    return {
      isQuietHours: false,
      reason: 'Unknown number format',
      timezone: 'America/New_York',
      localHour: 12
    };
  }

  const areaCode = norm.slice(2, 5);
  const timeZone = AREA_CODE_TIMEZONES[areaCode] || 'America/New_York';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === 'hour');
    const minutePart = parts.find(p => p.type === 'minute');
    const hour = parseInt(hourPart ? hourPart.value : '12', 10);
    const minute = parseInt(minutePart ? minutePart.value : '0', 10);

    // Quiet hours: 8:00 PM (20:00) to 8:59 AM (< 9)
    const isQuietHours = (hour >= 20 || hour < 9);

    const timeString = `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;

    return {
      isQuietHours,
      timezone: timeZone,
      areaCode,
      localTime: timeString,
      localHour: hour,
      window: '8:00 PM – 9:00 AM recipient local time',
      warning: isQuietHours
        ? `Quiet Hours Active: Current recipient time is ${timeString} (${timeZone}). Standard TCPA window prohibits marketing SMS between 8:00 PM and 9:00 AM.`
        : `Within Allowed Sending Window: Current recipient time is ${timeString} (${timeZone}).`
    };
  } catch (err) {
    return {
      isQuietHours: false,
      timezone: 'UTC',
      localTime: 'Unknown',
      window: '8:00 PM – 9:00 AM'
    };
  }
}

module.exports = {
  GSM_7_BASIC,
  GSM_7_EXTENSION,
  normalizeUsPhone,
  isValidUsE164,
  analyzeSmsContent,
  ensureOptOutLanguage,
  calculateEstimatedCost,
  checkRecipientQuietHours
};
