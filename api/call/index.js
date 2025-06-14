// /api/call.js
export default async function handler(req, res) {
  const crypto = require('crypto');

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

  const extension = advisorExtensionMap[advisor.toLowerCase()] || 100;
  if (!id || !extension) return res.status(400).send('Missing ID or advisor.');

  try {
    // 1. Get the task from ClickUp
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
      headers: { Authorization: CLICKUP_API_KEY }
    });
    const taskData = await taskRes.json();
    console.log(taskData, "DATA FROM TASK");
    const phoneField = taskData?.custom_fields?.find(f => f.name === 'Teléfono');

    const rawPhone = phoneField?.value;
    if (!rawPhone) return res.status(404).send('No phone found');

    const cleanedPhone = rawPhone.replace(/[^\d+]/g, '');

    // 2. Zadarma auth signature creation
    const method = '/v1/request/callback/';
    const paramsObj = {
      from: extension,
      to: cleanedPhone,
      is_hidden: '1'
    };

    // Ordenar alfabéticamente y construir query string
    const sortedParams = Object.keys(paramsObj).sort().reduce((acc, key) => {
      acc[key] = paramsObj[key];
      return acc;
    }, {});
    const queryString = new URLSearchParams(sortedParams).toString();
    const md5Hash = crypto.createHash('md5').update(queryString).digest('hex');
    const stringToSign = method + queryString + md5Hash;

    const hmac = crypto.createHmac('sha1', ZADARMA_API_SECRET)
      .update(stringToSign)
      .digest();

    const signature = Buffer.from(hmac).toString('base64');
    const authorizationHeader = `${ZADARMA_API_KEY}:${signature}`;

    const url = `https://api.zadarma.com${method}?${queryString}`;

    // 3. Make the call
    const callRes = await fetch(url, {
      headers: {
        Authorization: authorizationHeader
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
