export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ error: 'Telegram not configured' });
  }

  try {
    const { message, anonId, device, screen, timezone, context } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 250) {
      return res.status(400).json({ error: 'Message too long (250 char max)' });
    }

    const text = [
      `\u{1F4DD} *Feedback*`,
      `"${message.trim()}"`,
      ``,
      `\u{1F464} \`${anonId || 'unknown'}\``,
      `\u{1F4F1} ${device || 'unknown'}`,
      `\u{1F4BB} ${screen || 'unknown'}`,
      `\u{1F552} ${timezone || 'unknown'}`,
      `\u{1F4CD} ${context || 'unknown'}`,
    ].join('\n');

    const resp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Telegram API error:', err);
      return res.status(502).json({ error: 'Failed to send feedback' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
