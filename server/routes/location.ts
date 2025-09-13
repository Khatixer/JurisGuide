import express from 'express';
import { LocationService } from '../services/location-service';
import { authenticateToken } from '../middleware/auth';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();
const locationService = new LocationService();

// Geocode an address
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json(createErrorResponse('MISSING_ADDRESS', 'Address is required'));
    }

    const result = await locationService.geocodeAddress(address);
    
    if (!result) {
      return res.status(404).json(createErrorResponse('GEOCODE_FAILED', 'Could not geocode the provided address'));
    }

    res.json(createSuccessResponse(result));
  } catch (error) {
    logger.error('Geocoding error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('GEOCODE_ERROR', 'Failed to geocode address'));
  }
});

// Reverse geocode coordinates
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json(createErrorResponse('INVALID_COORDINATES', 'Valid latitude and longitude are required'));
    }

    const result = await locationService.reverseGeocode(latitude, longitude);
    
    if (!result) {
      return res.status(404).json(createErrorResponse('REVERSE_GEOCODE_FAILED', 'Could not reverse geocode the provided coordinates'));
    }

    res.json(createSuccessResponse(result));
  } catch (error) {
    logger.error('Reverse geocoding error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('REVERSE_GEOCODE_ERROR', 'Failed to reverse geocode coordinates'));
  }
});

// Calculate distance between two locations
router.post('/distance', async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json(createErrorResponse('MISSING_LOCATIONS', 'Origin and destination are required'));
    }

    if (!['driving', 'walking', 'transit'].includes(mode)) {
      return res.status(400).json(createErrorResponse('INVALID_MODE', 'Mode must be driving, walking, or transit'));
    }

    const result = await locationService.calculateDistance(origin, destination, mode);
    
    if (!result) {
      return res.status(404).json(createErrorResponse('DISTANCE_CALCULATION_FAILED', 'Could not calculate distance'));
    }

    res.json(createSuccessResponse(result));
  } catch (error) {
    logger.error('Distance calculation error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('DISTANCE_ERROR', 'Failed to calculate distance'));
  }
});

// Calculate Haversine distance (fallback)
router.post('/haversine-distance', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json(createErrorResponse('MISSING_LOCATIONS', 'Origin and destination are required'));
    }

    const distance = locationService.calculateHaversineDistance(origin, destination);

    res.json(createSuccessResponse({
      distance,
      unit: 'kilometers',
      method: 'haversine'
    }));
  } catch (error) {
    logger.error('Haversine distance calculation error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('HAVERSINE_ERROR', 'Failed to calculate Haversine distance'));
  }
});

// Validate an address
router.post('/validate', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json(createErrorResponse('MISSING_ADDRESS', 'Address is required'));
    }

    const isValid = await locationService.validateAddress(address);

    res.json(createSuccessResponse({
      address,
      isValid
    }));
  } catch (error) {
    logger.error('Address validation error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('VALIDATION_ERROR', 'Failed to validate address'));
  }
});

// Get timezone for coordinates
router.post('/timezone', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json(createErrorResponse('INVALID_COORDINATES', 'Valid latitude and longitude are required'));
    }

    const timezone = await locationService.getTimezone(latitude, longitude);
    
    if (!timezone) {
      return res.status(404).json(createErrorResponse('TIMEZONE_NOT_FOUND', 'Could not determine timezone'));
    }

    res.json(createSuccessResponse({
      latitude,
      longitude,
      timezone
    }));
  } catch (error) {
    logger.error('Timezone lookup error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('TIMEZONE_ERROR', 'Failed to get timezone'));
  }
});

// Find nearby lawyers (requires authentication)
router.post('/nearby-lawyers', authenticateToken, async (req, res) => {
  try {
    const { location, radius = 50 } = req.body;

    if (!location) {
      return res.status(400).json(createErrorResponse('MISSING_LOCATION', 'Location is required'));
    }

    const nearbyLawyers = await locationService.findNearbyLawyers(location, radius);

    res.json(createSuccessResponse({
      location,
      radius,
      lawyers: nearbyLawyers
    }));
  } catch (error) {
    logger.error('Nearby lawyers search error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('NEARBY_SEARCH_ERROR', 'Failed to find nearby lawyers'));
  }
});

export default router;