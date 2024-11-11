const properties = require('./properties.json');

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
  // First try with exact parameters
  const exactMatches = properties.filter(property => {
    let matches = true;

    if (type) {
      matches = matches && property.type.toLowerCase().includes(type.toLowerCase());
    }

    if (location) {
      const normalizedLocation = location.replace(/[-\s]/g, '').toLowerCase();
      const normalizedPropertyLocation = property.location.replace(/[-\s]/g, '').toLowerCase();
      matches = matches && normalizedPropertyLocation.includes(normalizedLocation);
    }

    if (price) {
      const minPrice = price.min !== null ? price.min : 0;
      const maxPrice = price.max !== null ? price.max : Infinity;
      const propertyPrice = parseInt(property.budget.replace(/[^0-9]/g, ''));
      matches = matches && propertyPrice >= minPrice && propertyPrice <= maxPrice;
    }

    if (bedrooms) {
      const minBedrooms = bedrooms.min !== null ? bedrooms.min : 0;
      const maxBedrooms = bedrooms.max !== null ? bedrooms.max : Infinity;
      matches = matches && property.bedrooms >= minBedrooms && property.bedrooms <= maxBedrooms;
    }

    if (bathrooms) {
      const minBathrooms = bathrooms.min !== null ? bathrooms.min : 0;
      const maxBathrooms = bathrooms.max !== null ? bathrooms.max : Infinity;
      matches = matches && property.bathrooms >= minBathrooms && property.bathrooms <= maxBathrooms;
    }

    if (area) {
      const minArea = area.min !== null ? area.min : 0;
      const maxArea = area.max !== null ? area.max : Infinity;
      const propertyArea = parseInt(property.area.replace(/[^0-9]/g, ''));
      matches = matches && propertyArea >= minArea && propertyArea <= maxArea;
    }

    return matches;
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
      matches = matches && property.bedrooms >= minBedrooms && property.bedrooms <= maxBedrooms;
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

function bookAppointment({ name, phone, email, bookingDate, bookingTime, propertyDetails }) {
  // Log the booking details for now
  console.log('Booking Appointment:', {
    name,
    phone,
    email,
    bookingDate,
    bookingTime,
    propertyDetails
  });

  // Here you can add logic to save the booking to a database or send a confirmation email
  // For now, we'll just return a success message
  return {
    success: true,
    message: `Appointment booked successfully for ${name} on ${bookingDate} at ${bookingTime}.`
  };
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
