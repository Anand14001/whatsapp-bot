import { FALLBACK_LINE } from './prompt.js';

const PAYMENT_DEFLECTION =
  "For anything involving payments, our team shares those details with you directly over a " +
  "verified call or email — I'm not able to send payment information over chat. I'll have someone " +
  "from the team reach out to you. Can I get your name?";

/**
 * Phone numbers the bot IS allowed to share, plus any ordinary Indian mobile
 * (e.g. a customer's own number echoed back). These are blanked out before the
 * long-digit-run check — otherwise "+91 97870 97006" is 12 digits and reads as
 * an account number, and the bot can't give out its own contact number.
 */
const OWN_NUMBERS = /(?:\+?91[\s-]?)?(?:97870[\s-]?97006|89396[\s-]?51525)/g;
const PHONE_SHAPE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;

function scrubPhones(text) {
  return text.replace(OWN_NUMBERS, ' ').replace(PHONE_SHAPE, ' ');
}

/** Patterns that must never appear in an OUTGOING message. */
const BLOCKED_OUTPUT = [
  // UPI IDs: name@okhdfcbank, 9787097006@paytm
  { name: 'upi_id',       re: /\b[\w.\-]{2,}@(?:ok[a-z]+|paytm|ybl|axl|upi|apl|ibl|sbi|icici|hdfcbank|airtel|freecharge)\b/i },
  // Long digit runs = account or card numbers. Checked against phone-scrubbed text.
  { name: 'account_no',   re: /\b(?:\d[ -]?){11,18}\b/, scrubbed: true },
  { name: 'ifsc',         re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/ },
  { name: 'card',         re: /\b(?:\d{4}[ -]?){3}\d{4}\b/, scrubbed: true },
  { name: 'cvv_otp',      re: /\b(?:cvv|otp)\b/i },
  { name: 'payment_link', re: /\b(?:rzp\.io|razorpay|pay\.google|paypal\.me|stripe\.com|cashfree|payu|instamojo|bit\.ly\/pay)\b/i },
  { name: 'crypto',       re: /\b(?:0x[a-fA-F0-9]{40}|bc1[a-z0-9]{20,})\b/ },
  { name: 'bank_phrase',  re: /\b(?:account\s*(?:no|number|holder)|a\/c\s*no|ifsc|swift\s*code|beneficiary\s*name|(?:our|my|the)\s+(?:bank\s+)?account)\b/i },
  { name: 'advance_terms',re: /\b\d{1,3}\s*%\s*(?:advance|upfront|in\s*advance)\b/i },
  { name: 'gst_pan',      re: /\b(?:\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d|[A-Z]{5}\d{4}[A-Z])\b/ },
];

/** A money figure in an outgoing message means the model invented a price. */
const PRICE_PATTERNS = [
  /(?:₹|rs\.?|inr|usd|\$)\s*[\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|lac|cr|crore|thousand)?/i,
  /\b[\d,]+\s*(?:k|lakh|lakhs|lac|cr|crore)\s*(?:rupees|rs|only)?\b/i,
  /\b(?:starts?\s+(?:at|from)|starting\s+(?:at|from)|around|approx\w*)\s*(?:₹|rs\.?|inr|\$)/i,
  /\bper\s*hour\s*(?:rate|charge)?\b/i,
];

const IDENTITY_LEAKS = [
  /\b(?:i am|i'm)\s+(?:an?\s+)?(?:ai|a\s+bot|a\s+language\s+model|chatbot|gemini|claude|gpt)\b/i,
  /\b(?:as an|being an)\s+ai\b/i,
  /\b(?:system|developer)\s+prompt\b/i,
  /\baccording to (?:my|the) (?:knowledge base|rules?|instructions?|chunks?)\b/i,
];

const GUARANTEE_LEAKS = [
  /\b(?:guarantee|guaranteed|assured|100%)\s+(?:#?1|first|top|number\s*one|ranking|rank|results?|leads?|sales?|roi)\b/i,
  /\byou(?:'ll| will)\s+(?:definitely\s+)?rank\s+(?:#?1|first|top)\b/i,
];

/**
 * Inspect an outgoing reply before it is sent.
 * Returns { text, blocked, reasons } — ALWAYS send `text`, never the original.
 */
export function guardOutgoing(reply, { customerAskedAboutPayment = false } = {}) {
  const reasons = [];
  let text = (reply ?? '').trim();
  const scrubbedText = scrubPhones(text);

  for (const { name, re, scrubbed } of BLOCKED_OUTPUT) {
    if (re.test(scrubbed ? scrubbedText : text)) reasons.push(name);
  }
  if (reasons.length > 0 || customerAskedAboutPayment) {
    return {
      text: PAYMENT_DEFLECTION,
      blocked: true,
      reasons: reasons.length ? reasons : ['payment_intent'],
    };
  }

  if (PRICE_PATTERNS.some(re => re.test(text))) {
    return {
      text:
        "We quote custom for every project, because scope changes everything — a 5-page business " +
        "site is a different job from an e-commerce build. " + FALLBACK_LINE +
        " What are you looking to build?",
      blocked: true,
      reasons: ['invented_price'],
    };
  }

  if (GUARANTEE_LEAKS.some(re => re.test(text))) {
    return {
      text:
        "I'll be straight with you — nobody can honestly guarantee a ranking or a lead count, " +
        "because the algorithms and your market both move. What we commit to is consistent " +
        "execution and reporting you can measure. What result are you chasing?",
      blocked: true,
      reasons: ['guarantee'],
    };
  }

  if (IDENTITY_LEAKS.some(re => re.test(text))) {
    text = "You're chatting with the Digital Dude team assistant 🙂 What can I help you with?";
    reasons.push('identity_leak');
  }

  // WhatsApp hard-caps a text body at 4096 characters.
  if (text.length > 1000) text = text.slice(0, 997) + '...';

  return { text, blocked: reasons.length > 0, reasons };
}

/** Detect payment intent in the INCOMING message, before the LLM ever runs. */
const PAYMENT_INTENT = [
  /\b(?:bank|account|a\/c)\s*(?:detail|details|number|no|info)\b/i,
  /\b(?:upi|gpay|google\s*pay|phonepe|phone\s*pe|paytm|bhim)\b/i,
  /\b(?:qr\s*code|payment\s*link|pay\s*link|payment\s*detail)/i,
  /\b(?:ifsc|swift|beneficiary|a\/c\s*no)\b/i,
  /\bhow\s+(?:do|can|should)\s+i\s+pay\b/i,
  /\b(?:where|how)\s+(?:do|to)\s+(?:i\s+)?(?:pay|transfer|send\s+money)\b/i,
  /\b(?:already|i\s+have)\s+paid\b/i,
  /\bsend\s+(?:me\s+)?(?:the\s+)?(?:invoice|bill|account|bank)\b/i,
  /\b(?:advance|upfront)\s+(?:payment|amount|percent)/i,
  /\brefund\b/i,
  /\b(?:card|cvv|otp)\s+(?:number|detail)/i,
  /\baccount\s+anuppunga\b/i,          // Tanglish: "send the account"
  /\bpayment\s+evlo\b/i,
];

export function hasPaymentIntent(message) {
  return PAYMENT_INTENT.some(re => re.test(message ?? ''));
}
