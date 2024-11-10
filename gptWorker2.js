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
          `You are a helpful fourclouser real estate assistant. 
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
           Parameters can be null, and the backend will return sorted properties based on the provided criteria. 
           If user want to book a property, confirm the property details with them and ask for Name, Phone Number, Email. 
           And also ask for a date and preferable time for the booking. 
           After booking, send a confirmation message to the user with the property details and the booking details. 
           And our agent will contact with the user.` },
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

    // Regular expression to match [call: followed by any characters until the next ]
    const pattern = /\[call:[^\]]+\]/g;
    const pattern2 = /\[call:(\w+),\s*parameters:\{(.+?)\}\]/;

    // Extract matches from the text
    // const callMatch = gptResponse.match(pattern);

    const callMatch = gptResponse.match(pattern2);

if (!callMatch) {
  return `[text: ${JSON.stringify(gptResponse)}]`;
} else {
  const functionName = callMatch[1];
  
  // Convert the parameters string to valid JSON format by adding double quotes to keys
  const parametersString = `{${callMatch[2]}}`.replace(/(\w+):/g, '"$1":');
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
      const filteredProperties = getProperties(parameters);
      dataResponse = `[response: ${JSON.stringify(filteredProperties)}]`;
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


    // // Check if properties data is present
    // const propertiesMatch = gptResponse.match(/\[response: (.+?)\]/);
    // if (!propertiesMatch) {
    //   // Return the text if no properties are found
    //   return `[text: ${JSON.stringify(gptResponse)}]`;
    // }

    // const propertiesString = propertiesMatch[1].trim();
    // console.log('Properties string:', propertiesString); // Log the properties string

    // const properties = JSON.parse(propertiesString);
    // const detailedProperties = properties.map(property => ({
    //   type: property.type,
    //   location: property.location,
    //   price: property.budget,
    //   bedrooms: property.bedrooms,
    //   bathrooms: property.bathrooms,
    //   area: property.area,
    //   photo: property.photo
    // }));

    // return `[properties: ${JSON.stringify(detailedProperties)}]`;
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    throw new Error('Failed to get response from OpenAI');
  }
}

module.exports = handleGPTMessage;
