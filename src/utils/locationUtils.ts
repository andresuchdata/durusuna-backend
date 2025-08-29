/**
 * Utility functions for location and distance calculations
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationVerificationResult {
  is_valid: boolean;
  distance_meters: number;
  error?: string;
}

/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate distance between two location coordinates
 * @param point1 - First location coordinates
 * @param point2 - Second location coordinates
 * @returns Distance in meters
 */
export function calculateDistanceBetweenPoints(
  point1: LocationCoordinates,
  point2: LocationCoordinates
): number {
  return calculateDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  );
}

/**
 * Verify if a location is within a specified radius of a center point
 * @param userLocation - User's current location
 * @param centerLocation - Center point (e.g., school location)
 * @param radiusMeters - Maximum allowed distance in meters
 * @returns Location verification result
 */
export function verifyLocationWithinRadius(
  userLocation: LocationCoordinates,
  centerLocation: LocationCoordinates,
  radiusMeters: number
): LocationVerificationResult {
  try {
    const distance = calculateDistanceBetweenPoints(userLocation, centerLocation);
    const isValid = distance <= radiusMeters;

    return {
      is_valid: isValid,
      distance_meters: Math.round(distance),
      error: isValid ? undefined : `Location is ${Math.round(distance)}m away from center point`
    };
  } catch (error) {
    return {
      is_valid: false,
      distance_meters: 0,
      error: 'Failed to calculate location distance'
    };
  }
}

/**
 * Format distance for display
 * @param distanceMeters - Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    const km = distanceMeters / 1000;
    return `${km.toFixed(1)}km`;
  }
}

/**
 * Check if location services are required based on settings
 * @param settings - School attendance settings
 * @returns True if location verification is required
 */
export function isLocationRequired(settings: any): boolean {
  return settings?.require_location === true;
}

/**
 * Validate location coordinates
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
}
