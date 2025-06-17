// /api/call.js
import crypto from 'crypto';

export default async function handler(req, res) {
  const { id, advisor } = req.query;

  const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
  const ZADARMA_API_KEY = process.env.ZADARMA_API_KEY;
  const ZADARMA_API_SECRET = process.env.ZADARMA_API_SECRET;

  const advisorExtensionMap = {
    chefe: '100',
    jeronimo: '101',
    franco: '103',
    alejandro: '104',
    facundo: '105',
    ricardo: '107',
    diogo: '108',
  };

  const extension = advisorExtensionMap[advisor?.toLowerCase()] || advisorExtensionMap['chefe'];
  if (!id || !extension) return res.status(400).send('Missing ID or advisor.');

  try {
    // 1. Get the task from ClickUp
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
      headers: { Authorization: CLICKUP_API_KEY }
    });
    const taskData = await taskRes.json();
    const phoneField = taskData?.custom_fields?.find(f => f.name === 'Teléfono');
    const rawPhone = phoneField?.value;
    if (!rawPhone) return res.status(404).send('No phone found');

    const cleanedPhone = rawPhone.replace(/[^\d+]/g, '');

    // 2. Zadarma parameters
    const method = '/v1/request/callback/';
    const params = {
      from: extension,
      to: cleanedPhone,
      is_hidden: '1'
    };

    // 3. Sort and encode params
    const sortedKeys = Object.keys(params).sort();
    const query = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');

    // 4. Create md5 hash of query
    const md5 = crypto.createHash('md5').update(query).digest('hex');

    // 5. Create string to sign
    const stringToSign = method + query + md5;

    // 6. Create HMAC-SHA1 signature and encode in base64
    const hmac = crypto.createHmac('sha1', ZADARMA_API_SECRET).update(stringToSign).digest();
    const hmacBase64 = Buffer.from(hmac).toString('base64');

    // 7. Final URL and headers
    const url = `https://api.zadarma.com${method}?${query}`;
    const headers = {
      Authorization: `${ZADARMA_API_KEY}:${hmacBase64}`
    };

    // 8. Make the request
    const callRes = await fetch(url, { headers });
    const result = await callRes.json();

    console.log('📞 Zadarma API response:', result);

    if (result.status !== 'success') {
      return res.status(500).send(`❌ Zadarma error: ${result.message}`);
    }

    return res.status(200).send('✅ Call started');
  } catch (err) {
    console.error(err);
    return res.status(500).send('❌ Failed to make call');
  }
}
