import {
  calculateDistance,
  calculateDistanceBetweenPoints,
  verifyLocationWithinRadius,
  formatDistance,
  isLocationRequired,
  isValidCoordinates,
  LocationCoordinates
} from '../locationUtils';

describe('LocationUtils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Test with known coordinates (approximately 1km apart)
      const lat1 = 40.7128; // New York
      const lon1 = -74.0060;
      const lat2 = 40.7228; // New York (about 1km away)
      const lon2 = -74.0060;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 1km (1000m) with some tolerance
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1200);
    });

    it('should return 0 for same coordinates', () => {
      const lat = 40.7128;
      const lon = -74.0060;
      
      const distance = calculateDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });
  });

  describe('calculateDistanceBetweenPoints', () => {
    it('should calculate distance using coordinate objects', () => {
      const point1: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060 };
      const point2: LocationCoordinates = { latitude: 40.7228, longitude: -74.0060 };

      const distance = calculateDistanceBetweenPoints(point1, point2);
      
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1200);
    });
  });

  describe('verifyLocationWithinRadius', () => {
    it('should return valid when location is within radius', () => {
      const userLocation: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060 };
      const centerLocation: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060 };
      const radiusMeters = 1000;

      const result = verifyLocationWithinRadius(userLocation, centerLocation, radiusMeters);
      
      expect(result.is_valid).toBe(true);
      expect(result.distance_meters).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid when location is outside radius', () => {
      const userLocation: LocationCoordinates = { latitude: 40.7589, longitude: -74.0060 };
      const centerLocation: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060 };
      const radiusMeters = 100; // Very small radius

      const result = verifyLocationWithinRadius(userLocation, centerLocation, radiusMeters);
      
      expect(result.is_valid).toBe(false);
      expect(result.distance_meters).toBeGreaterThan(100);
      expect(result.error).toContain('Location is');
    });
  });

  describe('formatDistance', () => {
    it('should format distances less than 1km in meters', () => {
      expect(formatDistance(500)).toBe('500m');
      expect(formatDistance(999)).toBe('999m');
    });

    it('should format distances 1km and above in kilometers', () => {
      expect(formatDistance(1000)).toBe('1.0km');
      expect(formatDistance(1500)).toBe('1.5km');
      expect(formatDistance(2500)).toBe('2.5km');
    });
  });

  describe('isLocationRequired', () => {
    it('should return true when require_location is true', () => {
      const settings = { require_location: true };
      expect(isLocationRequired(settings)).toBe(true);
    });

    it('should return false when require_location is false', () => {
      const settings = { require_location: false };
      expect(isLocationRequired(settings)).toBe(false);
    });

    it('should return false when settings is undefined', () => {
      expect(isLocationRequired(undefined)).toBe(false);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(40.7128, -74.0060)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates(91, 0)).toBe(false); // Latitude too high
      expect(isValidCoordinates(-91, 0)).toBe(false); // Latitude too low
      expect(isValidCoordinates(0, 181)).toBe(false); // Longitude too high
      expect(isValidCoordinates(0, -181)).toBe(false); // Longitude too low
      expect(isValidCoordinates(NaN, 0)).toBe(false); // NaN values
      expect(isValidCoordinates(0, NaN)).toBe(false);
      expect(isValidCoordinates('40.7128' as any, -74.0060)).toBe(false); // Wrong types
      expect(isValidCoordinates(40.7128, '-74.0060' as any)).toBe(false);
    });
  });
});
