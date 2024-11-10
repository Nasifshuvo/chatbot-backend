const axios = require('axios');
const { getProperties } = require('./propertyUtils');

async function handleHuggingFaceMessage(msg, apiKey, conversationHistory = []) {
  try {
    console.log('Sending to Hugging Face:', msg);

    // Format the input as a single string including conversation history
    const systemPrompt = `You are a helpful fourclouser real estate assistant. 
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
    }] to request data from the backend.`;

    // Include conversation history in the prompt
    const conversationContext = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n')
      : '';

    const fullPrompt = `${systemPrompt}\n\n${conversationContext ? conversationContext + '\n' : ''}User: ${msg}\nAssistant:`;

    // Make request to Hugging Face API
    const response = await axios.post(`https://api-inference.huggingface.co/models/${process.env.HUGGINGFACE_MODEL_NAME}`, {
      inputs: fullPrompt,
      parameters: {
        max_length: 300,
        temperature: 0.7,
        return_full_text: false,
        stop: ["\nUser:", "\n\nUser:", "User:"] // Stop generating when it reaches these tokens
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const huggingFaceResponse = response.data[0].generated_text.trim();
    console.log('Received from Hugging Face:', huggingFaceResponse);

    const pattern2 = /\[call:(\w+),\s*parameters:\{(.+?)\}\]/;
    const callMatch = huggingFaceResponse.match(pattern2);

    if (!callMatch) {
      return `[text: ${JSON.stringify(huggingFaceResponse)}]`;
    } else {
      const functionName = callMatch[1];
      const parametersString = `{${callMatch[2]}}`.replace(/(\w+):/g, '"$1":');
      let parameters;

      try {
        parameters = JSON.parse(parametersString);
      } catch (error) {
        console.error("JSON parsing error:", error);
        return `[text: ${JSON.stringify(huggingFaceResponse)}]`;
      }
      
      console.log('Function name:', functionName);
      console.log('Parameters:', parameters);
      
      let dataResponse = '';

      switch (functionName) {
        case 'getProperties':
          const filteredProperties = getProperties(parameters);
          dataResponse = `[response: ${JSON.stringify(filteredProperties)}]`;
          break;
        default:
          dataResponse = `[text: ${JSON.stringify(huggingFaceResponse)}]`;
          break;
      }

      console.log('Data response to Hugging Face:', dataResponse);
      return await handleHuggingFaceMessage(dataResponse, apiKey, [...conversationHistory, { role: "assistant", content: huggingFaceResponse }]);
    }

  } catch (error) {
    console.error('Error communicating with Hugging Face:', error);
    throw new Error('Failed to get response from Hugging Face');
  }
}

module.exports = handleHuggingFaceMessage;