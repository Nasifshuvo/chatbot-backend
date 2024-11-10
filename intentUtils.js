function recognizeIntent(message) {
  const intents = [
    { name: 'greeting', keywords: ['hi', 'hello', 'hey', 'how are you'] },
    { name: 'request_sample', keywords: ['sample', 'example', 'show me'] },
    { name: 'find_by_bedrooms', keywords: ['bedrooms', 'rooms'] },
    { name: 'find_by_budget', keywords: ['budget', 'price'] },
    { name: 'find_by_type', keywords: ['type', 'kind'] },
    { name: 'find_by_area', keywords: ['area', 'size'] },
    { name: 'find_by_location', keywords: ['location', 'place', 'city'] },
    { name: 'find_by_bathrooms', keywords: ['bathrooms', 'baths'] },
    // Add more intents as needed
  ];

  for (const intent of intents) {
    for (const keyword of intent.keywords) {
      if (message.toLowerCase().includes(keyword)) {
        return intent.name;
      }
    }
  }

  return 'general'; // Default to a general intent if no specific intent is recognized
}

module.exports = recognizeIntent;
