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
  Slider,
  Typography,
  Chip,
  Autocomplete,
  Grid,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';

const LEGAL_SPECIALIZATIONS = [
  'contract_law',
  'employment_law',
  'family_law',
  'criminal_law',
  'immigration_law',
  'business_law',
  'intellectual_property',
  'personal_injury',
  'real_estate',
  'tax_law',
  'bankruptcy',
  'estate_planning'
];

const LANGUAGES = [
  'english',
  'spanish',
  'french',
  'german',
  'italian',
  'portuguese',
  'chinese',
  'japanese',
  'korean',
  'arabic',
  'hindi',
  'russian'
];

const EXPERIENCE_LEVELS = [
  { value: '0-2', label: '0-2 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '6-10', label: '6-10 years' },
  { value: '11-15', label: '11-15 years' },
  { value: '16+', label: '16+ years' }
];

const LawyerSearchForm = ({ onSearch, loading = false, initialFilters = {} }) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    specializations: [],
    location: '',
    maxDistance: 50,
    budgetMin: 100,
    budgetMax: 500,
    languages: [],
    experienceLevel: '',
    availableWithin: '7', // days
    verifiedOnly: true,
    consultationAvailable: false,
    ...initialFilters
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBudgetChange = (event, newValue) => {
    setFilters(prev => ({
      ...prev,
      budgetMin: newValue[0],
      budgetMax: newValue[1]
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClearFilters = () => {
    setFilters({
      specializations: [],
      location: '',
      maxDistance: 50,
      budgetMin: 100,
      budgetMax: 500,
      languages: [],
      experienceLevel: '',
      availableWithin: '7',
      verifiedOnly: true,
      consultationAvailable: false
    });
  };

  const budgetMarks = [
    { value: 50, label: '$50' },
    { value: 200, label: '$200' },
    { value: 500, label: '$500' },
    { value: 1000, label: '$1000+' }
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h2">
            {t('lawyer_matching.search_criteria')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? t('common.hide_filters') : t('common.show_filters')}
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Legal Specializations */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              options={LEGAL_SPECIALIZATIONS}
              value={filters.specializations}
              onChange={(event, newValue) => handleFilterChange('specializations', newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={t(`legal_categories.${option}`)}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('lawyer_matching.specializations')}
                  placeholder={t('lawyer_matching.select_specializations')}
                />
              )}
            />
          </Grid>

          {/* Location */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('lawyer_matching.location')}
              placeholder={t('lawyer_matching.location_placeholder')}
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </Grid>

          {/* Budget Range */}
          <Grid item xs={12}>
            <Typography gutterBottom>
              {t('lawyer_matching.budget_range')}: ${filters.budgetMin} - ${filters.budgetMax}/hr
            </Typography>
            <Slider
              value={[filters.budgetMin, filters.budgetMax]}
              onChange={handleBudgetChange}
              valueLabelDisplay="auto"
              min={50}
              max={1000}
              marks={budgetMarks}
              sx={{ mt: 2 }}
            />
          </Grid>

          {showAdvanced && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('lawyer_matching.advanced_filters')}
                </Typography>
              </Grid>

              {/* Languages */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={LANGUAGES}
                  value={filters.languages}
                  onChange={(event, newValue) => handleFilterChange('languages', newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={t(`languages.${option}`)}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('lawyer_matching.languages')}
                      placeholder={t('lawyer_matching.select_languages')}
                    />
                  )}
                />
              </Grid>

              {/* Experience Level */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('lawyer_matching.experience_level')}</InputLabel>
                  <Select
                    value={filters.experienceLevel}
                    onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                    label={t('lawyer_matching.experience_level')}
                  >
                    <MenuItem value="">
                      <em>{t('common.any')}</em>
                    </MenuItem>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Max Distance */}
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>
                  {t('lawyer_matching.max_distance')}: {filters.maxDistance} miles
                </Typography>
                <Slider
                  value={filters.maxDistance}
                  onChange={(event, newValue) => handleFilterChange('maxDistance', newValue)}
                  valueLabelDisplay="auto"
                  min={5}
                  max={200}
                  marks={[
                    { value: 5, label: '5mi' },
                    { value: 25, label: '25mi' },
                    { value: 50, label: '50mi' },
                    { value: 100, label: '100mi' },
                    { value: 200, label: '200mi' }
                  ]}
                />
              </Grid>

              {/* Availability */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('lawyer_matching.available_within')}</InputLabel>
                  <Select
                    value={filters.availableWithin}
                    onChange={(e) => handleFilterChange('availableWithin', e.target.value)}
                    label={t('lawyer_matching.available_within')}
                  >
                    <MenuItem value="1">{t('lawyer_matching.within_1_day')}</MenuItem>
                    <MenuItem value="3">{t('lawyer_matching.within_3_days')}</MenuItem>
                    <MenuItem value="7">{t('lawyer_matching.within_1_week')}</MenuItem>
                    <MenuItem value="14">{t('lawyer_matching.within_2_weeks')}</MenuItem>
                    <MenuItem value="30">{t('lawyer_matching.within_1_month')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Additional Options */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.verifiedOnly}
                        onChange={(e) => handleFilterChange('verifiedOnly', e.target.checked)}
                      />
                    }
                    label={t('lawyer_matching.verified_only')}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.consultationAvailable}
                        onChange={(e) => handleFilterChange('consultationAvailable', e.target.checked)}
                      />
                    }
                    label={t('lawyer_matching.consultation_available')}
                  />
                </Box>
              </Grid>
            </>
          )}
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
          >
            {t('common.clear_filters')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            size="large"
          >
            {loading ? t('common.searching') : t('lawyer_matching.search_lawyers')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LawyerSearchForm;