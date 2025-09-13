import axios from 'axios';
import { Location } from '../types';
import { logger } from '../utils/logger';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  mode: 'driving' | 'walking' | 'transit';
}

export class LocationService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Google Maps API key not configured');
    }
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey
        }
      });

      const data = response.data as any;
      if (data.status !== 'OK' || !data.results.length) {
        logger.warn('Geocoding failed', undefined, undefined, { address, status: data.status });
        return null;
      }

      const result = data.results[0];
      const location = result.geometry.location;
      const components = result.address_components;

      // Extract address components
      const getComponent = (types: string[]) => {
        const component = components.find((comp: any) => 
          comp.types.some((type: string) => types.includes(type))
        );
        return component?.long_name || '';
      };

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        city: getComponent(['locality', 'administrative_area_level_2']),
        state: getComponent(['administrative_area_level_1']),
        country: getComponent(['country']),
        postalCode: getComponent(['postal_code'])
      };
    } catch (error) {
      logger.error('Geocoding error', undefined, undefined, error);
      throw new Error('Failed to geocode address');
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey
        }
      });

      const data = response.data as any;
      if (data.status !== 'OK' || !data.results.length) {
        logger.warn('Reverse geocoding failed', undefined, undefined, { latitude, longitude, status: data.status });
        return null;
      }

      const result = data.results[0];
      const location = result.geometry.location;
      const components = result.address_components;

      const getComponent = (types: string[]) => {
        const component = components.find((comp: any) => 
          comp.types.some((type: string) => types.includes(type))
        );
        return component?.long_name || '';
      };

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        city: getComponent(['locality', 'administrative_area_level_2']),
        state: getComponent(['administrative_area_level_1']),
        country: getComponent(['country']),
        postalCode: getComponent(['postal_code'])
      };
    } catch (error) {
      logger.error('Reverse geocoding error', undefined, undefined, error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  async calculateDistance(
    origin: Location, 
    destination: Location, 
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<DistanceResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
        params: {
          origins: `${origin.latitude},${origin.longitude}`,
          destinations: `${destination.latitude},${destination.longitude}`,
          mode,
          units: 'metric',
          key: this.apiKey
        }
      });

      const data = response.data as any;
      if (data.status !== 'OK' || !data.rows.length) {
        logger.warn('Distance calculation failed', undefined, undefined, { 
          origin, 
          destination, 
          mode, 
          status: data.status 
        });
        return null;
      }

      const element = data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        logger.warn('Distance element failed', undefined, undefined, { element });
        return null;
      }

      return {
        distance: element.distance.value / 1000, // Convert meters to kilometers
        duration: element.duration.value / 60, // Convert seconds to minutes
        mode
      };
    } catch (error) {
      logger.error('Distance calculation error', undefined, undefined, error);
      throw new Error('Failed to calculate distance');
    }
  }

  // Calculate distance using Haversine formula (fallback when API is not available)
  calculateHaversineDistance(origin: Location, destination: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origin.latitude)) * Math.cos(this.toRadians(destination.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async findNearbyLawyers(
    location: Location, 
    radiusKm: number = 50
  ): Promise<{ lawyerId: string; distance: number }[]> {
    // This would integrate with the lawyer database to find lawyers within radius
    // For now, this is a placeholder that would be implemented with the lawyer service
    
    try {
      // This would be implemented by querying the lawyers table with spatial queries
      // For PostgreSQL, you could use PostGIS extension for spatial queries
      
      logger.info('Finding nearby lawyers', undefined, undefined, { location, radiusKm });
      
      // Placeholder implementation
      return [];
    } catch (error) {
      logger.error('Error finding nearby lawyers', undefined, undefined, error);
      throw new Error('Failed to find nearby lawyers');
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      const result = await this.geocodeAddress(address);
      return result !== null;
    } catch (error) {
      logger.error('Address validation error', undefined, undefined, error);
      return false;
    }
  }

  // Get timezone for a location
  async getTimezone(latitude: number, longitude: number): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await axios.get(`${this.baseUrl}/timezone/json`, {
        params: {
          location: `${latitude},${longitude}`,
          timestamp,
          key: this.apiKey
        }
      });

      const data = response.data as any;
      if (data.status !== 'OK') {
        logger.warn('Timezone lookup failed', undefined, undefined, { 
          latitude, 
          longitude, 
          status: data.status 
        });
        return null;
      }

      return data.timeZoneId;
    } catch (error) {
      logger.error('Timezone lookup error', undefined, undefined, error);
      throw new Error('Failed to get timezone');
    }
  }
}