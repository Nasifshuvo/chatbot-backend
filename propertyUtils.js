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
  const filteredProperties = properties.filter(property => {
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

  if (filteredProperties.length === 0) {
    return "No Property Found";
  }

  return filteredProperties;
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
