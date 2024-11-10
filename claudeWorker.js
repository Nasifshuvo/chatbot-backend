const Anthropic = require('@anthropic-ai/sdk');

async function handleClaudeMessage(msg, apiKey) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const claudeResponse = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: msg }],
  });

  return claudeResponse.choices[0].text.trim();
}

module.exports = handleClaudeMessage;
