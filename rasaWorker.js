const axios = require('axios');

async function handleRasaMessage(msg, rasaUrl) {
  const rasaResponse = await axios.post(`${rasaUrl}/webhooks/rest/webhook`, {
    sender: 'user',
    message: msg
  });

  return rasaResponse.data.map(res => res.text).join(' ');
}

module.exports = handleRasaMessage;
