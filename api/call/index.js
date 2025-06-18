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
    // 1. Get task from ClickUp
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
      headers: { Authorization: CLICKUP_API_KEY }
    });
    const taskData = await taskRes.json();
    const phoneField = taskData?.custom_fields?.find(f => f.name === 'Teléfono');
    const rawPhone = phoneField?.value;
    if (!rawPhone) return res.status(404).send('No phone found');

    const cleanedPhone = rawPhone.replace(/[^\d+]/g, '');

    // 2. Zadarma API encryption
    const method = '/v1/request/callback/';
    const params = {
      from: extension,
      to: cleanedPhone
    };

    const sortedKeys = Object.keys(params).sort();
    const query = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');

    // Step 1: md5 from query
    const md5Hex = crypto.createHash('md5').update(query).digest('hex');

    // Step 2: create stringToSign
    const stringToSign = method + query + md5Hex;

    // Step 3: HMAC-SHA1 (hex)
    const hmacHex = crypto
      .createHmac('sha1', ZADARMA_API_SECRET)
      .update(stringToSign)
      .digest('hex'); // get hex like Apps Script

    // Step 4: base64 from hex
    const hmacBase64 = Buffer.from(hmacHex, 'hex').toString('base64');

    // Step 5: auth header
    const authHeader = `${ZADARMA_API_KEY}:${hmacBase64}`;

    // Step 6: final request
    const url = `https://api.zadarma.com${method}?${query}`;
    const callRes = await fetch(url, {
      headers: {
        Authorization: authHeader
      }
    });

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
