import { LocationService } from '../../services/location-service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LocationService', () => {
  let locationService: LocationService;

  beforeEach(() => {
    locationService = new LocationService();
    jest.clearAllMocks();
  });

  describe('geocodeAddress', () => {
    it('should geocode an address successfully', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [{
            formatted_address: '123 Main St, New York, NY 10001, USA',
            geometry: {
              location: {
                lat: 40.7128,
                lng: -74.0060
              }
            },
            address_components: [
              { long_name: 'New York', types: ['locality'] },
              { long_name: 'NY', types: ['administrative_area_level_1'] },
              { long_name: 'United States', types: ['country'] },
              { long_name: '10001', types: ['postal_code'] }
            ]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.geocodeAddress('123 Main St, New York, NY');

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        formattedAddress: '123 Main St, New York, NY 10001, USA',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        postalCode: '10001'
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: '123 Main St, New York, NY',
            key: ''
          }
        }
      );
    });

    it('should return null for failed geocoding', async () => {
      const mockResponse = {
        data: {
          status: 'ZERO_RESULTS',
          results: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });

    it('should throw error when API key is not configured', async () => {
      // This test assumes no API key is set in the test environment
      await expect(locationService.geocodeAddress('123 Main St'))
        .rejects.toThrow('Google Maps API key not configured');
    });
  });

  describe('calculateHaversineDistance', () => {
    it('should calculate distance between two locations', () => {
      const origin = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      };

      const destination = {
        latitude: 34.0522,
        longitude: -118.2437,
        address: 'Los Angeles, CA',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postalCode: '90001'
      };

      const distance = locationService.calculateHaversineDistance(origin, destination);

      // Distance between NYC and LA is approximately 3944 km
      expect(distance).toBeCloseTo(3944, -2); // Within 100km accuracy
    });

    it('should return 0 for same location', () => {
      const location = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      };

      const distance = locationService.calculateHaversineDistance(location, location);

      expect(distance).toBe(0);
    });
  });

  describe('validateAddress', () => {
    it('should return true for valid address', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [{
            formatted_address: '123 Main St, New York, NY 10001, USA',
            geometry: { location: { lat: 40.7128, lng: -74.0060 } },
            address_components: []
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const isValid = await locationService.validateAddress('123 Main St, New York, NY');

      expect(isValid).toBe(true);
    });

    it('should return false for invalid address', async () => {
      const mockResponse = {
        data: {
          status: 'ZERO_RESULTS',
          results: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const isValid = await locationService.validateAddress('Invalid Address');

      expect(isValid).toBe(false);
    });

    it('should return false on API error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const isValid = await locationService.validateAddress('123 Main St');

      expect(isValid).toBe(false);
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates successfully', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [{
            formatted_address: '123 Main St, New York, NY 10001, USA',
            geometry: {
              location: {
                lat: 40.7128,
                lng: -74.0060
              }
            },
            address_components: [
              { long_name: 'New York', types: ['locality'] },
              { long_name: 'NY', types: ['administrative_area_level_1'] },
              { long_name: 'United States', types: ['country'] },
              { long_name: '10001', types: ['postal_code'] }
            ]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.reverseGeocode(40.7128, -74.0060);

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        formattedAddress: '123 Main St, New York, NY 10001, USA',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        postalCode: '10001'
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance using Google Maps API', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          rows: [{
            elements: [{
              status: 'OK',
              distance: { value: 5000 }, // 5000 meters
              duration: { value: 600 }   // 600 seconds
            }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const origin = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      };

      const destination = {
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Times Square, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10036'
      };

      const result = await locationService.calculateDistance(origin, destination, 'driving');

      expect(result).toEqual({
        distance: 5, // 5000 meters = 5 km
        duration: 10, // 600 seconds = 10 minutes
        mode: 'driving'
      });
    });

    it('should return null for failed distance calculation', async () => {
      const mockResponse = {
        data: {
          status: 'ZERO_RESULTS',
          rows: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const origin = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      };

      const destination = {
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Times Square, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10036'
      };

      const result = await locationService.calculateDistance(origin, destination);

      expect(result).toBeNull();
    });
  });

  describe('getTimezone', () => {
    it('should get timezone for coordinates', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          timeZoneId: 'America/New_York'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const timezone = await locationService.getTimezone(40.7128, -74.0060);

      expect(timezone).toBe('America/New_York');
    });

    it('should return null for failed timezone lookup', async () => {
      const mockResponse = {
        data: {
          status: 'INVALID_REQUEST'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const timezone = await locationService.getTimezone(999, 999);

      expect(timezone).toBeNull();
    });
  });
});