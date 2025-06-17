import crypto from 'crypto';

// Test simple: check balance (no params)
const testMethod = '/v1/info/balance/';
const testParams = {};
const testQuery = '';
const testMd5 = crypto.createHash('md5').update('').digest('hex');
const testStringToSign = testMethod + testQuery + testMd5;
const testSignature = crypto.createHmac('sha1', ZADARMA_API_SECRET).update(testStringToSign).digest();
const testBase64 = Buffer.from(testSignature).toString('base64');
const testAuthHeader = `${ZADARMA_API_KEY}:${testBase64}`;

const testUrl = `https://api.zadarma.com${testMethod}`;

const response = await fetch(testUrl, {
  headers: { Authorization: testAuthHeader }
});
console.log(await response.text());
