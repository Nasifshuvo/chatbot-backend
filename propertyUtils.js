const properties = require('./properties.json');
const nodemailer = require('nodemailer');

function filterPropertiesByBedrooms(minBedrooms) {
  return properties.filter(property => property.bedrooms >= minBedrooms);
}

function filterPropertiesByBathrooms(minBathrooms) {
  return properties.filter(property => property.bathrooms >= minBathrooms);
}

function filterPropertiesByBudget(maxBudget) {
  return properties.filter(property => parseInt(property.budget.replace(/[^0-9]/g, '')) <= maxBudget);
}

function filterPropertiesByType(type) {
  return properties.filter(property => property.type.toLowerCase() === type.toLowerCase());
}

function filterPropertiesByArea(minArea) {
  return properties.filter(property => parseInt(property.area.replace(/[^0-9]/g, '')) >= minArea);
}

function filterPropertiesByLocation(location) {
  return properties.filter(property => {
    const normalizedLocation = location.replace(/[-\s]/g, '').toLowerCase();
    const normalizedPropertyLocation = property.location.replace(/[-\s]/g, '').toLowerCase();
    return normalizedPropertyLocation.includes(normalizedLocation);
  });
}

function getPropertyData() {
  return properties;
}

function getProperties({ type = null, location = null, price = null, bedrooms = null, bathrooms = null, area = null }) {
  // First, let's log the raw data to verify what we're working with
  console.log('First property from JSON:', properties[0]);
  
  const exactMatches = properties.filter(property => {
    // Basic validation to ensure property exists
    if (!property) return false;
    
    let matches = true;

    if (bedrooms && bedrooms.min !== null) {
      // Convert bedrooms to number, default to 0 if invalid
      const propertyBedrooms = Number(property.bedrooms) || 0;
      const minBedrooms = Number(bedrooms.min);
      
      console.log('Bedroom comparison:', {
        property: property.id || 'unknown',
        propertyBedrooms,
        minBedrooms,
        matches: propertyBedrooms >= minBedrooms
      });
      
      matches = matches && propertyBedrooms >= minBedrooms;
    }

    if (type && matches) {
      const propertyType = String(property.type || '').toLowerCase();
      const searchType = String(type).toLowerCase();
      matches = matches && propertyType.includes(searchType);
    }

    if (location && matches) {
      const propertyLocation = String(property.location || '').toLowerCase();
      const searchLocation = String(location).toLowerCase();
      matches = matches && propertyLocation.includes(searchLocation);
    }

    if (price && matches) {
      let propertyPrice;
      // Handle different price formats
      if (typeof property.budget === 'number') {
        propertyPrice = property.budget;
      } else if (typeof property.budget === 'string') {
        propertyPrice = parseInt(property.budget.replace(/[^0-9]/g, '')) || 0;
      } else {
        propertyPrice = 0;
      }

      if (price.min !== null) matches = matches && propertyPrice >= price.min;
      if (price.max !== null) matches = matches && propertyPrice <= price.max;
    }

    if (bathrooms && bathrooms.min !== null && matches) {
      const propertyBathrooms = Number(property.bathrooms) || 0;
      matches = matches && propertyBathrooms >= bathrooms.min;
    }

    if (area && area.min !== null && matches) {
      let propertyArea;
      if (typeof property.area === 'number') {
        propertyArea = property.area;
      } else if (typeof property.area === 'string') {
        propertyArea = parseInt(property.area.replace(/[^0-9]/g, '')) || 0;
      } else {
        propertyArea = 0;
      }
      matches = matches && propertyArea >= area.min;
    }

    return matches;
  });

  // Log the results for debugging
  console.log('Search results:', {
    criteria: { type, location, price, bedrooms, bathrooms, area },
    totalProperties: properties.length,
    matchesFound: exactMatches.length,
    firstMatch: exactMatches[0] || 'No matches'
  });

  if (exactMatches.length > 0) {
    return {
      properties: exactMatches,
      message: "Found exact matches based on your criteria."
    };
  }

  // If no exact matches, try relaxed search
  const relaxedMatches = properties.filter(property => {
    let matches = true;
    const PRICE_FLEXIBILITY = 0.2; // 20% flexibility
    const ROOM_FLEXIBILITY = 1; // ±1 room
    const AREA_FLEXIBILITY = 0.15; // 15% flexibility

    if (type) {
      // For type, we keep it strict as it's a fundamental characteristic
      matches = matches && property.type.toLowerCase().includes(type.toLowerCase());
    }

    if (location) {
      // For location, we'll keep it strict as it's usually important
      const normalizedLocation = location.replace(/[-\s]/g, '').toLowerCase();
      const normalizedPropertyLocation = property.location.replace(/[-\s]/g, '').toLowerCase();
      matches = matches && normalizedPropertyLocation.includes(normalizedLocation);
    }

    if (price) {
      const minPrice = price.min !== null ? price.min * (1 - PRICE_FLEXIBILITY) : 0;
      const maxPrice = price.max !== null ? price.max * (1 + PRICE_FLEXIBILITY) : Infinity;
      const propertyPrice = parseInt(property.budget.replace(/[^0-9]/g, ''));
      matches = matches && propertyPrice >= minPrice && propertyPrice <= maxPrice;
    }

    if (bedrooms) {
      const minBedrooms = bedrooms.min !== null ? Math.max(1, bedrooms.min - ROOM_FLEXIBILITY) : 0;
      const maxBedrooms = bedrooms.max !== null ? bedrooms.max + ROOM_FLEXIBILITY : Infinity;
      const propertyBedrooms = Number(property.bedrooms);
      matches = matches && propertyBedrooms >= minBedrooms && propertyBedrooms <= maxBedrooms;
    }

    if (bathrooms) {
      const minBathrooms = bathrooms.min !== null ? Math.max(1, bathrooms.min - ROOM_FLEXIBILITY) : 0;
      const maxBathrooms = bathrooms.max !== null ? bathrooms.max + ROOM_FLEXIBILITY : Infinity;
      matches = matches && property.bathrooms >= minBathrooms && property.bathrooms <= maxBathrooms;
    }

    if (area) {
      const minArea = area.min !== null ? area.min * (1 - AREA_FLEXIBILITY) : 0;
      const maxArea = area.max !== null ? area.max * (1 + AREA_FLEXIBILITY) : Infinity;
      const propertyArea = parseInt(property.area.replace(/[^0-9]/g, ''));
      matches = matches && propertyArea >= minArea && propertyArea <= maxArea;
    }

    return matches;
  });

  if (relaxedMatches.length > 0) {
    return {
      properties: relaxedMatches,
      message: "No exact matches found, but here are some similar properties with relaxed criteria: \n" +
               "- Price range: ±20% \n" +
               "- Rooms: ±1 room \n" +
               "- Area: ±15%"
    };
  }

  // If still no matches, return a helpful message
  return {
    properties: [],
    message: "No properties found. Consider:\n" +
             "- Expanding your price range\n" +
             "- Being more flexible with the number of rooms\n" +
             "- Looking in nearby locations\n" +
             "- Adjusting your area requirements"
  };
}

async function bookAppointment({ name, phone, email, date, time, propertyDetails, conversationHistory }) {
  try {
    // Create conversation log
    const conversationLog = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    // Send confirmation email to client
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Property Viewing Appointment Confirmation',
      html: `
        <h2>Your Property Viewing Appointment is Confirmed!</h2>
        <p>Dear ${name},</p>
        <p>Your appointment details:</p>
        <ul>
          <li>Date: ${date}</li>
          <li>Time: ${time}</li>
          <li>Property Details: ${propertyDetails}</li>
        </ul>
        <p>Our representative will contact you shortly.</p>
      `
    });

    // Send notification to admin with conversation history
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'shuvo.nasif@gmail.com',
      subject: `New Property Viewing - ${name}`,
      html: `
        <h2>New Booking</h2>
        <p>Client Details:</p>
        <ul>
          <li>Name: ${name}</li>
          <li>Phone: ${phone}</li>
          <li>Email: ${email}</li>
        </ul>
        <p>Appointment: ${date} at ${time}</p>
        <p>Property: ${propertyDetails}</p>
      `,
      attachments: [{
        filename: `conversation_${Date.now()}.txt`,
        content: conversationLog
      }]
    });

    return {
      success: true,
      message: 'Appointment booked successfully! You will receive a confirmation email shortly.'
    };
  } catch (error) {
    console.error('Booking error:', error);
    return {
      success: false,
      message: 'Failed to book appointment. Please try again.'
    };
  }
}

module.exports = {
  getProperties,
  bookAppointment,
  filterPropertiesByBedrooms,
  filterPropertiesByBathrooms,
  filterPropertiesByBudget,
  filterPropertiesByType,
  filterPropertiesByArea,
  filterPropertiesByLocation,
  getPropertyData
};
