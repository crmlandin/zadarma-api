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

    // Zadarma params
    const method = '/v1/request/callback/';
    const params = {
      from: extension,
      to: cleanedPhone
    };

    // Step 1: sort and encode query
    const sortedKeys = Object.keys(params).sort();
    const query = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');

    // Step 2: md5 hex
    const md5 = crypto.createHash('md5').update(query).digest('hex');

    // Step 3: stringToSign
    const stringToSign = method + query + md5;

    // Step 4: HMAC-SHA1 → HEX string (not binary)
    const hmacBuffer = crypto.createHmac('sha1', ZADARMA_API_SECRET).update(stringToSign).digest();
    const hmacHex = [...hmacBuffer].map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');

    // Step 5: base64 from HEX
    const hmacBase64 = Buffer.from(hmacHex).toString('base64');

    // Step 6: Authorization header
    const authHeader = `${ZADARMA_API_KEY}:${hmacBase64}`;
    const url = `https://api.zadarma.com${method}?${query}`;

    const callRes = await fetch(url, {
      headers: { Authorization: authHeader }
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
