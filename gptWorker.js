const axios = require('axios');
const {
  filterPropertiesByBedrooms,
  filterPropertiesByBudget,
  filterPropertiesByType,
  filterPropertiesByArea,
  filterPropertiesByLocation,
  filterPropertiesByBathrooms
} = require('./propertyUtils');
const recognizeIntent = require('./intentUtils');

async function handleGPTMessage(msg, apiKey) {
  try {
    let responseText = '';
    const intent = recognizeIntent(msg);

    if (intent === 'request_sample') {
      responseText = 'Sure! To help you better, could you please specify your preferences? For example, what is your budget, preferred location, or type of property you are interested in?';
    } else if (intent.startsWith('find_by_')) {
      let filteredProperties = [];
      switch (intent) {
        case 'find_by_bedrooms':
          const bedroomsMatch = msg.match(/(\d+)\s*bedrooms/);
          if (bedroomsMatch) {
            const minBedrooms = parseInt(bedroomsMatch[1]);
            filteredProperties = filterPropertiesByBedrooms(minBedrooms);
          }
          break;
        case 'find_by_budget':
          const budgetMatch = msg.match(/\$?(\d+,\d+)/);
          if (budgetMatch) {
            const maxBudget = parseInt(budgetMatch[1].replace(/,/g, ''));
            filteredProperties = filterPropertiesByBudget(maxBudget);
          }
          break;
        case 'find_by_type':
          const typeMatch = msg.match(/type (\w+)/);
          if (typeMatch) {
            filteredProperties = filterPropertiesByType(typeMatch[1]);
          }
          break;
        case 'find_by_area':
          const areaMatch = msg.match(/(\d+)\s*sqft/);
          if (areaMatch) {
            const minArea = parseInt(areaMatch[1]);
            filteredProperties = filterPropertiesByArea(minArea);
          }
          break;
        case 'find_by_location':
          const locationMatch = msg.match(/location (\w+)/);
          if (locationMatch) {
            filteredProperties = filterPropertiesByLocation(locationMatch[1]);
          }
          break;
        case 'find_by_bathrooms':
          const bathroomsMatch = msg.match(/(\d+)\s*bathrooms/);
          if (bathroomsMatch) {
            const minBathrooms = parseInt(bathroomsMatch[1]);
            filteredProperties = filterPropertiesByBathrooms(minBathrooms);
          }
          break;
        default:
          break;
      }

      if (filteredProperties.length > 0) {
        responseText = 'Here are some properties that match your criteria:\n' +
          filteredProperties.map(p => `Type: ${p.type}, Location: ${p.location}, Price: ${p.budget}`).join('\n');
      } else {
        responseText = 'I couldn\'t find any properties matching your criteria.';
      }
    } else {
      // Handle general conversation using GPT
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful real estate assistant. Your role is to assist users with property-related queries and help convert them into clients. If the query is not related to real estate, politely inform the user." },
          { role: "user", content: msg }
        ],
        max_tokens: 150
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      responseText = response.data.choices[0].message.content.trim();
    }

    return responseText;
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    throw new Error('Failed to get response from OpenAI');
  }
}

module.exports = handleGPTMessage;
