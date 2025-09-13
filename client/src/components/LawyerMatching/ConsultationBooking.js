import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  VideoCall as VideoCallIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';

const CONSULTATION_TYPES = [
  { value: 'video', icon: VideoCallIcon, duration: 30 },
  { value: 'phone', icon: PhoneIcon, duration: 30 },
  { value: 'in_person', icon: LocationIcon, duration: 60 }
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

const ConsultationBooking = ({ 
  open, 
  onClose, 
  lawyer, 
  onBookingComplete,
  loading = false 
}) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    consultationType: 'video',
    selectedDate: '',
    selectedTime: '',
    duration: 30,
    caseDescription: '',
    urgency: 'medium',
    contactInfo: {
      phone: '',
      email: '',
      preferredContact: 'email'
    },
    paymentMethod: 'card'
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errors, setErrors] = useState({});

  const steps = [
    t('consultation.select_type_time'),
    t('consultation.case_details'),
    t('consultation.contact_payment'),
    t('consultation.confirmation')
  ];

  useEffect(() => {
    if (bookingData.selectedDate && open) {
      loadAvailableSlots();
    }
  }, [bookingData.selectedDate, open]);

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      // Simulate API call to get available slots
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock available slots (in real app, this would come from API)
      const mockSlots = TIME_SLOTS.filter(() => Math.random() > 0.3);
      setAvailableSlots(mockSlots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBookingData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 0:
        if (!bookingData.selectedDate) {
          newErrors.selectedDate = t('consultation.errors.date_required');
        }
        if (!bookingData.selectedTime) {
          newErrors.selectedTime = t('consultation.errors.time_required');
        }
        break;
      case 1:
        if (!bookingData.caseDescription.trim()) {
          newErrors.caseDescription = t('consultation.errors.case_description_required');
        }
        break;
      case 2:
        if (!bookingData.contactInfo.email.trim()) {
          newErrors['contactInfo.email'] = t('consultation.errors.email_required');
        }
        if (!bookingData.contactInfo.phone.trim()) {
          newErrors['contactInfo.phone'] = t('consultation.errors.phone_required');
        }
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

  const handleBooking = async () => {
    if (!validateStep(2)) return;
    
    try {
      // In real app, this would make API call to book consultation
      await onBookingComplete(bookingData);
      onClose();
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getConsultationFee = () => {
    const baseRate = lawyer.pricing.consultationFee || lawyer.pricing.hourlyRate;
    const duration = bookingData.duration;
    return (baseRate / 60) * duration;
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            {/* Consultation Type */}
            <Typography variant="h6" gutterBottom>
              {t('consultation.select_type')}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {CONSULTATION_TYPES.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Grid item xs={12} sm={4} key={type.value}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: bookingData.consultationType === type.value ? 2 : 1,
                        borderColor: bookingData.consultationType === type.value ? 'primary.main' : 'divider'
                      }}
                      onClick={() => handleInputChange('consultationType', type.value)}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <IconComponent sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                        <Typography variant="subtitle1">
                          {t(`consultation.types.${type.value}`)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {type.duration} min
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Date Selection */}
            <TextField
              fullWidth
              type="date"
              label={t('consultation.select_date')}
              value={bookingData.selectedDate}
              onChange={(e) => handleInputChange('selectedDate', e.target.value)}
              error={!!errors.selectedDate}
              helperText={errors.selectedDate}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: new Date().toISOString().split('T')[0]
              }}
              sx={{ mb: 3 }}
            />

            {/* Time Selection */}
            {bookingData.selectedDate && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('consultation.available_times')}
                </Typography>
                
                {loadingSlots ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={1}>
                    {availableSlots.map((time) => (
                      <Grid item key={time}>
                        <Chip
                          label={time}
                          clickable
                          color={bookingData.selectedTime === time ? 'primary' : 'default'}
                          variant={bookingData.selectedTime === time ? 'filled' : 'outlined'}
                          onClick={() => handleInputChange('selectedTime', time)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
                
                {errors.selectedTime && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.selectedTime}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('consultation.case_description')}
              placeholder={t('consultation.case_description_placeholder')}
              value={bookingData.caseDescription}
              onChange={(e) => handleInputChange('caseDescription', e.target.value)}
              error={!!errors.caseDescription}
              helperText={errors.caseDescription || t('consultation.case_description_help')}
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>{t('consultation.urgency')}</InputLabel>
              <Select
                value={bookingData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value)}
                label={t('consultation.urgency')}
              >
                <MenuItem value="low">{t('urgency_levels.low')}</MenuItem>
                <MenuItem value="medium">{t('urgency_levels.medium')}</MenuItem>
                <MenuItem value="high">{t('urgency_levels.high')}</MenuItem>
                <MenuItem value="critical">{t('urgency_levels.critical')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('consultation.contact_information')}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('consultation.email')}
                  type="email"
                  value={bookingData.contactInfo.email}
                  onChange={(e) => handleInputChange('contactInfo.email', e.target.value)}
                  error={!!errors['contactInfo.email']}
                  helperText={errors['contactInfo.email']}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('consultation.phone')}
                  type="tel"
                  value={bookingData.contactInfo.phone}
                  onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                  error={!!errors['contactInfo.phone']}
                  helperText={errors['contactInfo.phone']}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>{t('consultation.preferred_contact')}</InputLabel>
              <Select
                value={bookingData.contactInfo.preferredContact}
                onChange={(e) => handleInputChange('contactInfo.preferredContact', e.target.value)}
                label={t('consultation.preferred_contact')}
              >
                <MenuItem value="email">{t('consultation.contact_email')}</MenuItem>
                <MenuItem value="phone">{t('consultation.contact_phone')}</MenuItem>
                <MenuItem value="both">{t('consultation.contact_both')}</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              {t('consultation.payment_information')}
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('consultation.payment_info')}
            </Alert>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CreditCardIcon color="primary" />
              <Typography variant="body1">
                {t('consultation.total_fee')}: {formatCurrency(getConsultationFee())}
              </Typography>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              {t('consultation.booking_summary')}
            </Alert>

            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar src={lawyer.profile.avatar}>
                    {lawyer.profile.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{lawyer.profile.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lawyer.specializations.slice(0, 2).map(spec => t(`legal_categories.${spec}`)).join(', ')}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <List dense>
                  <ListItem>
                    <ListItemText
                      primary={t('consultation.type')}
                      secondary={t(`consultation.types.${bookingData.consultationType}`)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={t('consultation.date_time')}
                      secondary={`${bookingData.selectedDate} at ${bookingData.selectedTime}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={t('consultation.duration')}
                      secondary={`${bookingData.duration} minutes`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={t('consultation.total_fee')}
                      secondary={formatCurrency(getConsultationFee())}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
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
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarIcon color="primary" />
          <Typography variant="h5">
            {t('consultation.book_consultation')}
          </Typography>
        </Box>
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
                    <Button
                      variant="contained"
                      onClick={handleBooking}
                      disabled={loading}
                    >
                      {loading ? t('consultation.booking') : t('consultation.confirm_booking')}
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

export default ConsultationBooking;