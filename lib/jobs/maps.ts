// Google's universal maps link opens the Maps app on Android and iPhone, the browser elsewhere.
export function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
