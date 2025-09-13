import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Autocomplete,
  Alert
} from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';

const DISPUTE_CATEGORIES = [
  'contract_dispute',
  'employment_dispute',
  'family_dispute',
  'property_dispute',
  'business_dispute',
  'consumer_dispute',
  'neighbor_dispute',
  'partnership_dispute'
];

const CreateMediationDialog = ({ open, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    disputeSummary: '',
    category: '',
    jurisdiction: [],
    parties: [{ name: '', email: '', role: 'complainant' }],
    urgency: 'medium',
    culturalFactors: '',
    preferredLanguage: 'en'
  });
  const [errors, setErrors] = useState({});

  const steps = [
    t('mediation.create_steps.dispute_details'),
    t('mediation.create_steps.parties_info'),
    t('mediation.create_steps.preferences')
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handlePartyChange = (index, field, value) => {
    const newParties = [...formData.parties];
    newParties[index] = { ...newParties[index], [field]: value };
    setFormData(prev => ({ ...prev, parties: newParties }));
  };

  const addParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', email: '', role: 'respondent' }]
    }));
  };

  const removeParty = (index) => {
    if (formData.parties.length > 1) {
      const newParties = formData.parties.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, parties: newParties }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 0:
        if (!formData.disputeSummary.trim()) {
          newErrors.disputeSummary = t('mediation.errors.dispute_summary_required');
        }
        if (!formData.category) {
          newErrors.category = t('mediation.errors.category_required');
        }
        if (formData.jurisdiction.length === 0) {
          newErrors.jurisdiction = t('mediation.errors.jurisdiction_required');
        }
        break;
      case 1:
        formData.parties.forEach((party, index) => {
          if (!party.name.trim()) {
            newErrors[`party_${index}_name`] = t('mediation.errors.party_name_required');
          }
          if (!party.email.trim()) {
            newErrors[`party_${index}_email`] = t('mediation.errors.party_email_required');
          }
        });
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        disputeSummary: '',
        category: '',
        jurisdiction: [],
        parties: [{ name: '', email: '', role: 'complainant' }],
        urgency: 'medium',
        culturalFactors: '',
        preferredLanguage: 'en'
      });
      setActiveStep(0);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('mediation.dispute_summary')}
              placeholder={t('mediation.dispute_summary_placeholder')}
              value={formData.disputeSummary}
              onChange={(e) => handleInputChange('disputeSummary', e.target.value)}
              error={!!errors.disputeSummary}
              helperText={errors.disputeSummary || t('mediation.dispute_summary_help')}
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.category}>
              <InputLabel>{t('mediation.dispute_category')}</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                label={t('mediation.dispute_category')}
              >
                {DISPUTE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {t(`legal_categories.${category}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              options={['US-Federal', 'US-California', 'US-New York', 'UK-England', 'Canada-Federal']}
              value={formData.jurisdiction}
              onChange={(event, newValue) => handleInputChange('jurisdiction', newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('mediation.jurisdiction')}
                  error={!!errors.jurisdiction}
                  helperText={errors.jurisdiction}
                />
              )}
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth>
              <InputLabel>{t('mediation.urgency')}</InputLabel>
              <Select
                value={formData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value)}
                label={t('mediation.urgency')}
              >
                <MenuItem value="low">{t('urgency_levels.low')}</MenuItem>
                <MenuItem value="medium">{t('urgency_levels.medium')}</MenuItem>
                <MenuItem value="high">{t('urgency_levels.high')}</MenuItem>
                <MenuItem value="critical">{t('urgency_levels.critical')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('mediation.parties_involved')}
            </Typography>
            
            {formData.parties.map((party, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    {t('mediation.party')} {index + 1}
                  </Typography>
                  {formData.parties.length > 1 && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeParty(index)}
                    >
                      {t('mediation.remove_party')}
                    </Button>
                  )}
                </Box>

                <TextField
                  fullWidth
                  label={t('mediation.party_name')}
                  value={party.name}
                  onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                  error={!!errors[`party_${index}_name`]}
                  helperText={errors[`party_${index}_name`]}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label={t('mediation.party_email')}
                  type="email"
                  value={party.email}
                  onChange={(e) => handlePartyChange(index, 'email', e.target.value)}
                  error={!!errors[`party_${index}_email`]}
                  helperText={errors[`party_${index}_email`]}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth>
                  <InputLabel>{t('mediation.party_role')}</InputLabel>
                  <Select
                    value={party.role}
                    onChange={(e) => handlePartyChange(index, 'role', e.target.value)}
                    label={t('mediation.party_role')}
                  >
                    <MenuItem value="complainant">{t('mediation.roles.complainant')}</MenuItem>
                    <MenuItem value="respondent">{t('mediation.roles.respondent')}</MenuItem>
                    <MenuItem value="third_party">{t('mediation.roles.third_party')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}

            <Button
              variant="outlined"
              onClick={addParty}
              sx={{ mb: 2 }}
            >
              {t('mediation.add_party')}
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('mediation.cultural_factors')}
              placeholder={t('mediation.cultural_factors_placeholder')}
              value={formData.culturalFactors}
              onChange={(e) => handleInputChange('culturalFactors', e.target.value)}
              helperText={t('mediation.cultural_factors_help')}
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>{t('mediation.preferred_language')}</InputLabel>
              <Select
                value={formData.preferredLanguage}
                onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                label={t('mediation.preferred_language')}
              >
                <MenuItem value="en">{t('languages.english')}</MenuItem>
                <MenuItem value="es">{t('languages.spanish')}</MenuItem>
                <MenuItem value="fr">{t('languages.french')}</MenuItem>
                <MenuItem value="de">{t('languages.german')}</MenuItem>
                <MenuItem value="zh">{t('languages.chinese')}</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info">
              {t('mediation.ai_mediation_info')}
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        {t('mediation.start_new_case')}
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                  {index > 0 && (
                    <Button onClick={handleBack}>
                      {t('common.back')}
                    </Button>
                  )}
                  
                  {index < steps.length - 1 ? (
                    <Button variant="contained" onClick={handleNext}>
                      {t('common.next')}
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={handleSubmit}>
                      {t('mediation.start_mediation')}
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateMediationDialog;