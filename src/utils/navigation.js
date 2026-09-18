/**
 * Utility to open Google Maps / Waze navigation directly for any client
 * Works seamlessly on mobile devices (triggers native Maps/Waze app) and desktop browsers.
 */
export const openMapsForClient = (clientName, clientAddress) => {
  if (!clientName && !clientAddress) return;
  
  const cleanAddress = (clientAddress && typeof clientAddress === 'string' && clientAddress !== 'null' && clientAddress.trim()) 
    ? clientAddress.trim() 
    : '';

  // If address exists, navigate directly to it; otherwise search by Client Name in Asturias
  const query = cleanAddress 
    ? cleanAddress 
    : `${String(clientName).trim()}, Asturias`;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
};
