// /api/call.js
export default async function handler(req, res) {
  const axios = require('axios');
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

  const extension = advisorExtensionMap[advisor] || 100;
  if (!id || !extension) return res.status(400).send('Missing ID or advisor.');

  const taskRes = await axios.get(`https://api.clickup.com/api/v2/task/${id}`, {
    headers: { Authorization: CLICKUP_API_KEY }
  });

  const task = taskRes.data;
  const phoneField = task.custom_fields.find(f => f.name === 'Teléfono');
  const phone = phoneField?.value?.replace(/[^\d+]/g, '');

  if (!phone) return res.status(404).send('No phone found.');

  const params = `from=${extension}&to=${phone}&is_hidden=1`;
  const signature = crypto.createHmac('sha1', ZADARMA_API_SECRET).update(params).digest('hex');

  await axios.get(`https://api.zadarma.com/v1/request/callback/?${params}`, {
    headers: {
      Authorization: ZADARMA_API_KEY,
      Signature: signature
    }
  });

  res.status(200).send('Call initiated.');
}
