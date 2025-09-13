import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';

const LEGAL_CATEGORIES = [
  'contract_dispute',
  'employment_law',
  'family_law',
  'property_law',
  'criminal_law',
  'immigration_law',
  'business_law',
  'intellectual_property',
  'personal_injury',
  'tax_law'
];

const URGENCY_LEVELS = [
  { value: 'low', color: 'success' },
  { value: 'medium', color: 'warning' },
  { value: 'high', color: 'error' },
  { value: 'critical', color: 'error' }
];

const JURISDICTIONS = [
  'US-Federal',
  'US-California',
  'US-New York',
  'US-Texas',
  'UK-England',
  'UK-Scotland',
  'Canada-Federal',
  'Canada-Ontario',
  'Australia-Federal',
  'EU-General'
];

const CULTURAL_BACKGROUNDS = [
  'western_individualistic',
  'eastern_collectivistic',
  'latin_american',
  'middle_eastern',
  'african',
  'nordic',
  'mediterranean',
  'south_asian',
  'east_asian',
  'indigenous'
];

const LegalQueryForm = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    jurisdiction: [],
    urgency: 'medium',
    culturalContext: '',
    language: 'en'
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.description.trim()) {
      newErrors.description = t('legal_query.errors.description_required');
    } else if (formData.description.length < 50) {
      newErrors.description = t('legal_query.errors.description_too_short');
    }
    
    if (!formData.category) {
      newErrors.category = t('legal_query.errors.category_required');
    }
    
    if (formData.jurisdiction.length === 0) {
      newErrors.jurisdiction = t('legal_query.errors.jurisdiction_required');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {t('legal_query.title')}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('legal_query.subtitle')}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          {/* Legal Issue Description */}
          <TextField
            fullWidth
            multiline
            rows={6}
            label={t('legal_query.description_label')}
            placeholder={t('legal_query.description_placeholder')}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description || t('legal_query.description_help')}
            sx={{ mb: 3 }}
          />

          {/* Legal Category */}
          <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.category}>
            <InputLabel>{t('legal_query.category_label')}</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              label={t('legal_query.category_label')}
            >
              {LEGAL_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {t(`legal_categories.${category}`)}
                </MenuItem>
              ))}
            </Select>
            {errors.category && (
              <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                {errors.category}
              </Typography>
            )}
          </FormControl>

          {/* Jurisdiction Selection */}
          <Autocomplete
            multiple
            options={JURISDICTIONS}
            value={formData.jurisdiction}
            onChange={(event, newValue) => handleInputChange('jurisdiction', newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={t(`jurisdictions.${option}`) || option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('legal_query.jurisdiction_label')}
                placeholder={t('legal_query.jurisdiction_placeholder')}
                error={!!errors.jurisdiction}
                helperText={errors.jurisdiction || t('legal_query.jurisdiction_help')}
              />
            )}
            sx={{ mb: 3 }}
          />

          {/* Urgency Level */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{t('legal_query.urgency_label')}</InputLabel>
            <Select
              value={formData.urgency}
              onChange={(e) => handleInputChange('urgency', e.target.value)}
              label={t('legal_query.urgency_label')}
            >
              {URGENCY_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={t(`urgency_levels.${level.value}`)}
                      color={level.color}
                      variant="outlined"
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Cultural Context */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{t('legal_query.cultural_context_label')}</InputLabel>
            <Select
              value={formData.culturalContext}
              onChange={(e) => handleInputChange('culturalContext', e.target.value)}
              label={t('legal_query.cultural_context_label')}
            >
              <MenuItem value="">
                <em>{t('legal_query.cultural_context_none')}</em>
              </MenuItem>
              {CULTURAL_BACKGROUNDS.map((background) => (
                <MenuItem key={background} value={background}>
                  {t(`cultural_backgrounds.${background}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, py: 1.5 }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                {t('legal_query.processing')}
              </Box>
            ) : (
              t('legal_query.submit_button')
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LegalQueryForm;