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

  const extension = advisorExtensionMap[advisor] || 100;
  if (!id || !extension) return res.status(400).send('Missing ID or advisor.');

  try {
    // 1. Get the task from ClickUp
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
      headers: { Authorization: CLICKUP_API_KEY }
    });
    const task = await taskRes.json();

    const phoneField = task.custom_fields.find(f => f.name === 'Teléfono');
    const rawPhone = phoneField?.value;
    if (!rawPhone) return res.status(404).send('No phone found');

    const cleanedPhone = rawPhone.replace(/[^\d+]/g, '');

    // 2. Trigger Zadarma call
    const params = `from=${extension}&to=${cleanedPhone}&is_hidden=1`;
    const signature = crypto.createHmac('sha1', ZADARMA_API_SECRET).update(params).digest('hex');

    await fetch(`https://api.zadarma.com/v1/request/callback/?${params}`, {
      headers: {
        Authorization: ZADARMA_API_KEY,
        Signature: signature
      }
    });

    return res.status(200).send('✅ Call started');
  } catch (err) {
    console.error(err);
    return res.status(500).send('❌ Failed to make call');
  }
}
