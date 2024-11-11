const axios = require('axios');
const { getProperties } = require('./propertyUtils');

async function handleGPTMessage(msg, apiKey, conversationHistory = []) {
  try {
    console.log('Sending to GPT:', msg); // Log the message being sent to GPT

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", 
          content: 
          `You are a helpful foreclosure real estate assistant. 
          Use [call:getProperties, parameters:{
            type:string | null, 
            location:string | null, 
            price:{
              min:number | null, 
              max:number | null
            }, 
            bedrooms:{
              min:number | null, 
              max:number | null
            }, 
            bathrooms:{
              min:number | null, 
              max:number | null
            }, 
            area:{
              min:number | null, 
              max:number | null
            }
          }] to request data from the backend. 

          When you receive [ALTERNATE_SUGGESTIONS], format your response naturally:
          
          For ALTERNATE_LOCATION suggestions:
          - Acknowledge that the requested location isn't available
          - Present the alternative locations enthusiastically
          - Highlight the benefits of the suggested properties
          
          For ALTERNATE_BEDROOMS suggestions:
          - Explain that the exact bedroom count isn't available
          - Present the closest alternatives
          - Emphasize the benefits of slightly larger/smaller options
          
          For ALTERNATE_PRICE suggestions:
          - Acknowledge the budget constraints
          - Present slightly higher-priced options tactfully
          - Highlight the additional value these properties offer

          Always:
          - Format prices in a readable way ($XXX,XXX)
          - Highlight key features of each property

          For booking:
          - If user wants to book a property, confirm the property details with them and ask for Name, Phone Number, Email
          - Ask for a date and preferred time for the booking
          - After booking, send a confirmation message with the property details and booking details
          - Inform that our agent will contact the user` },
        ...conversationHistory,
        { role: "user", content: msg }
      ],
      max_tokens: 300
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const gptResponse = response.data.choices[0].message.content.trim();
    console.log('Received from GPT:', gptResponse); // Log the response received from GPT

    // Update the pattern to handle multiline responses with whitespace
    const pattern2 = /\[call:(\w+),\s*parameters:\s*\{([\s\S]+?)\}\]/;

    const callMatch = gptResponse.match(pattern2);

    if (!callMatch) {
      return `[text: ${JSON.stringify(gptResponse)}]`;
    } else {
      const functionName = callMatch[1];
      
      // Clean up the parameters string by removing newlines and extra spaces
      const parametersString = `{${callMatch[2]}}`
        .replace(/\n\s*/g, ' ')  // Replace newlines and following spaces with a single space
        .replace(/(\w+):/g, '"$1":');  // Add quotes to keys
      let parameters;

      try {
        parameters = JSON.parse(parametersString); // Now this should work correctly
      } catch (error) {
        console.error("JSON parsing error:", error);
        return `[text: ${JSON.stringify(gptResponse)}]`; // Return the response in case of error
      }
      
      console.log('Function name:', functionName);
      console.log('Parameters:', parameters);
      
      let dataResponse = '';

      switch (functionName) {
        case 'getProperties':
          const propertyResults = getProperties(parameters);
          
          // If no exact matches found, try relaxed search automatically
          if (propertyResults.properties.length === 0) {
            let suggestedProperties = null;
            let relaxationType = '';

            // Try without location
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

            // Try with expanded bedrooms if no results yet
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

            // Try with increased budget if still no results
            if (!suggestedProperties && parameters.price && parameters.price.max) {
              const relaxedPriceResults = getProperties({
                ...parameters,
                price: {
                  ...parameters.price,
                  max: parameters.price.max * 1.2 // 20% increase
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
              
              // Send this structured data back to GPT for natural language processing
              return await handleGPTMessage(
                `[ALTERNATE_SUGGESTIONS: ${JSON.stringify(alternateResponse)}]`, 
                apiKey, 
                [...conversationHistory, { role: "assistant", content: gptResponse }]
              );
            }
          }
          
          dataResponse = `[response: ${JSON.stringify(propertyResults)}]`;
          break;
        // Add more cases for other functions
        default:
          dataResponse = `[text: ${JSON.stringify(gptResponse)}]`; // Return the text for unhandled cases
          break;
      }

      console.log('Data response to GPT:', dataResponse); // Log the data response being sent back to GPT
      // Send the data response back to GPT
      return await handleGPTMessage(dataResponse, apiKey, [...conversationHistory, { role: "assistant", content: gptResponse }]);
    }
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    throw new Error('Failed to get response from OpenAI');
  }
}

module.exports = handleGPTMessage;
