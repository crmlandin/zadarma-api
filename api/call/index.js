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
    const method = '/v1/request/callback/';
    const params = {
      from: extension,
      to: '573219374889', // Puedes reemplazar por el número real del task
    };

    // 1. Ordenar y codificar
    const sortedKeys = Object.keys(params).sort();
    const query = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');

    // 2. MD5 en formato HEX
    const md5Hex = crypto.createHash('md5').update(query).digest('hex');

    // 3. Formar stringToSign
    const stringToSign = method + query + md5Hex;

    // 4. HMAC-SHA1 → HEX
    const hmacHex = crypto.createHmac('sha1', ZADARMA_API_SECRET).update(stringToSign).digest('hex');

    // 5. Convertir HEX string a buffer y luego a base64
    const hmacBuffer = Buffer.from(hmacHex, 'hex');
    const hmacBase64 = hmacBuffer.toString('base64');

    const authHeader = `${ZADARMA_API_KEY}:${hmacBase64}`;
    const url = `https://api.zadarma.com${method}?${query}`;

    const callRes = await fetch(url, {
      headers: {
        Authorization: authHeader,
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
