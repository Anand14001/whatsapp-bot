import { guardOutgoing, hasPaymentIntent } from './src/guard.js';

// [message, shouldBeBlocked]
const outgoing = [
  ['Our account is 123456789012, IFSC HDFC0001234', true],
  ['Pay to wedigitaldude@okhdfcbank', true],
  ['Our UPI is 9787097006@paytm', true],
  ['Card: 4111 1111 1111 1111', true],
  ['Please share the OTP you received', true],
  ['Pay here: https://rzp.io/l/abcd', true],
  ['Send to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e', true],
  ['Our account number is given below', true],
  ['We need 50% advance before starting', true],
  ['A website starts from Rs 25,000', true],
  ['It will cost around Rs 50k', true],
  ['Budget is ₹1,50,000 for this', true],
  ['Roughly 2 lakh for the full build', true],
  ['Our per hour rate is reasonable', true],
  ['We guarantee #1 ranking on Google', true],
  ['Guaranteed results in 30 days', true],
  ['You will rank first on Google', true],
  ["I'm an AI language model, I can't help", true],
  ['According to my knowledge base, rule 7 applies', true],
  // --- must PASS ---
  ['Yes! We build custom websites. What business are you in?', false],
  ["We quote custom for every project. What are you looking to build?", false],
  ['Kandippa pannalam! Neenga enna business run panreenga?', false],
  ['Our team is available 9:30 AM to 5:30 PM, Monday to Saturday.', false],
  ['You can reach the team on +91 97870 97006 anytime during working hours.', false],
  ['We have been running since 2022 out of Chennai.', false],
  ["I'll check with the team and get back to you on that. What's your business?", false],
  ['We integrate payment gateways into the stores we build.', false],
  ['Most clients see movement within a few months.', false],
  ['Office: No.90, Ramanujakoodam Street, Poonamallee, Chennai 600056.', false],
  // --- phone-number regressions: these MUST stay shareable ---
  ['Reach us on +91 97870 97006 or +91 89396 51525', false],
  ['Call 9787097006', false],
  ['Is 9876543210 the best number to reach you?', false],
  // --- but real account numbers must still be caught ---
  ['Our account is 123456789012', true],
  ['Our bank account is below', true],
  ['A/C No 50100123456789', true],
  ['Transfer to 500101234567890123', true],
];

let fails = 0;
console.log('--- OUTGOING GUARD ---');
for (const [msg, expectBlocked] of outgoing) {
  const r = guardOutgoing(msg);
  const ok = r.blocked === expectBlocked;
  if (!ok) fails++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} | ${r.blocked ? 'BLOCKED' : 'passed '} ${String(r.reasons).padEnd(18)} | ${msg.slice(0, 55)}`
  );
}

// [message, shouldDetectPaymentIntent]
const incoming = [
  ['send your bank details', true],
  ['whats your gpay number', true],
  ['share account number', true],
  ['QR code anuppunga', true],
  ['how do i pay you', true],
  ['where to transfer the money', true],
  ['i already paid, please confirm', true],
  ['send me the invoice', true],
  ['how much advance payment needed', true],
  ['what is your refund policy', true],
  ['ifsc code please', true],
  ['payment evlo', true],
  ['your upi id?', true],
  // --- must NOT trigger ---
  ['how much for a website', false],
  ['do you build e-commerce stores with payment gateway integration', false],
  ['can you manage my instagram', false],
  ['what are your timings', false],
  ['website panna mudiyuma', false],
  ['i want to talk to someone', false],
];

console.log('\n--- INCOMING PAYMENT INTENT ---');
for (const [msg, expect] of incoming) {
  const got = hasPaymentIntent(msg);
  const ok = got === expect;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} | ${String(got).padEnd(5)} | ${msg}`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
