const axios = require('axios');
const { getProperties, bookAppointment } = require('./propertyUtils');

async function handleGPTMessage(msg, apiKey, conversationHistory = []) {
  try {
    console.log('Sending to GPT:', msg);

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", 
          content: 
          `You are a helpful and flexible foreclosure real estate assistant. Focus on being user-friendly and accommodating. 
          If you need property information from databse then call function by following the rule below.
          Then the backend will send you the search result. Then with the result process text and response.

          CRITICAL RULES:
          1. NEVER just talk about searching - ALWAYS execute the search immediately
          2. When user says "no" or has no preferences, IMMEDIATELY search with these defaults:
             [call:getProperties, parameters:{
               bedrooms: {min: 2},
               price: {max: null},
               location: null,
               type: null,
               bathrooms: null,
               area: null
             }]
          3. When user asks about properties or location, but you haven't searched yet:
             - Execute search immediately with available criteria
             - Don't say "I will search" or "please hold"
          4. After EVERY search, immediately follow up with:
             - If results found: Present the properties
             - If no results: Suggest booking an agent appointment

          AUTOMATIC SEARCH TRIGGERS:
          - User says "no" → Execute default search
          - User mentions any criteria → Search with that criteria
          - User asks about properties → Search with known criteria
          - User seems confused/waiting → Execute search with what you know

          For property search, use:
          [call:getProperties, parameters:{
            type:string | null, 
            location:string | null, 
            price:{min:number | null, max:number | null}, 
            bedrooms:{min:number | null, max:number | null}, 
            bathrooms:{min:number | null, max:number | null}, 
            area:{min:number | null, max:number | null}
          }]

          For booking appointments, use:
          [call:bookAppointment, parameters:{
            name: string,
            phone: string,
            email: string,
            date: string,
            time: string,
            propertyDetails: string
          }]

          NEVER SAY:
          - "I will search"
          - "Please hold"
          - "Let me find"
          - "I'll look for"
          
          INSTEAD, JUST EXECUTE THE SEARCH IMMEDIATELY!

          When you receive [ALTERNATE_SUGGESTIONS]:
          - Present alternatives naturally
          - Highlight key features
          - Keep the tone helpful and positive

          If no properties found:
          - Immediately suggest booking an appointment
          - Use bookAppointment call with available information

          Always maintain a helpful, flexible approach.` },
        ...conversationHistory,
        { role: "user", content: msg }
      ],
      max_tokens: 600
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const gptResponse = response.data.choices[0].message.content.trim();
    console.log('Received from GPT:', gptResponse);

    const pattern2 = /\[call:(\w+),\s*parameters:\s*\{([\s\S]+?)\}\]/;

    const callMatch = gptResponse.match(pattern2);

    if (!callMatch) {
      return gptResponse.startsWith('[text:') ? gptResponse : `[text: ${JSON.stringify(gptResponse)}]`;
    } else {
      const functionName = callMatch[1];
      
      const parametersString = `{${callMatch[2]}}`
        .replace(/\n\s*/g, ' ')
        .replace(/(\w+):/g, '"$1":');
      let parameters;

      try {
        parameters = JSON.parse(parametersString);
      } catch (error) {
        console.error("JSON parsing error:", error);
        return `[text: ${JSON.stringify(gptResponse)}]`;
      }
      
      console.log('Function name:', functionName);
      console.log('Parameters:', parameters);
      
      let dataResponse = '';

      switch (functionName) {
        case 'getProperties':
          const propertyResults = getProperties(parameters);
          
          if (propertyResults.properties.length === 0) {
            let suggestedProperties = null;
            let relaxationType = '';

            if (parameters.location) {
              const noLocationResults = getProperties({
                ...parameters,
                location: null
              });
              if (noLocationResults.properties.length > 0) {
                suggestedProperties = noLocationResults;
                relaxationType = `ALTERNATE_LOCATION`;
              }
            }

            if (!suggestedProperties && parameters.bedrooms) {
              const relaxedBedroomsResults = getProperties({
                ...parameters,
                bedrooms: {
                  min: parameters.bedrooms.min ? parameters.bedrooms.min - 1 : null,
                  max: parameters.bedrooms.max ? parameters.bedrooms.max + 1 : null
                }
              });
              if (relaxedBedroomsResults.properties.length > 0) {
                suggestedProperties = relaxedBedroomsResults;
                relaxationType = `ALTERNATE_BEDROOMS`;
              }
            }

            if (!suggestedProperties && parameters.price && parameters.price.max) {
              const relaxedPriceResults = getProperties({
                ...parameters,
                price: {
                  ...parameters.price,
                  max: parameters.price.max * 1.2
                }
              });
              if (relaxedPriceResults.properties.length > 0) {
                suggestedProperties = relaxedPriceResults;
                relaxationType = `ALTERNATE_PRICE`;
              }
            }

            if (suggestedProperties) {
              const alternateResponse = {
                type: relaxationType,
                originalCriteria: {
                  type: parameters.type || 'any type',
                  location: parameters.location || 'any location',
                  price: parameters.price?.max ? parameters.price.max : null,
                  bedrooms: parameters.bedrooms?.min || null
                },
                properties: suggestedProperties.properties
              };
              
              return await handleGPTMessage(
                `[ALTERNATE_SUGGESTIONS: ${JSON.stringify(alternateResponse)}]`, 
                apiKey, 
                [...conversationHistory, { role: "assistant", content: gptResponse }]
              );
            }
          }
          
          dataResponse = `[response: ${JSON.stringify(propertyResults)}]`;
          break;
        case 'bookAppointment':
          const bookingResult = await bookAppointment({
            ...parameters,
            conversationHistory: [...conversationHistory, { role: "assistant", content: gptResponse }]
          });
          dataResponse = `[text: ${JSON.stringify(bookingResult.message)}]`;
          break;
        default:
          dataResponse = `[text: ${JSON.stringify(gptResponse)}]`;
          break;
      }

      console.log('Data response to GPT:', dataResponse);
      return await handleGPTMessage(dataResponse, apiKey, [...conversationHistory, { role: "assistant", content: gptResponse }]);
    }
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    throw new Error('Failed to get response from OpenAI');
  }
}

module.exports = handleGPTMessage;
