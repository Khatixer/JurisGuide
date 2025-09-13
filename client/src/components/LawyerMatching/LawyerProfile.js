import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  Avatar,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Badge
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  VideoCall as VideoCallIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';

const LawyerProfile = ({ lawyer, onContact, onBookConsultation, compact = false }) => {
  const { t } = useTranslation();
  const [showFullProfile, setShowFullProfile] = useState(false);

  const getVerificationColor = (status) => {
    const colors = {
      'verified': 'success',
      'pending': 'warning',
      'unverified': 'error'
    };
    return colors[status] || 'default';
  };

  const getAvailabilityColor = (availability) => {
    if (availability === 'available') return 'success';
    if (availability === 'busy') return 'warning';
    return 'error';
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const CompactView = () => (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 4 } }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                lawyer.verificationStatus === 'verified' ? (
                  <VerifiedIcon color="success" fontSize="small" />
                ) : null
              }
            >
              <Avatar
                src={lawyer.profile.avatar}
                sx={{ width: 60, height: 60 }}
              >
                {lawyer.profile.name.charAt(0)}
              </Avatar>
            </Badge>
          </Grid>
          
          <Grid item xs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" component="h3">
                {lawyer.profile.name}
              </Typography>
              <Chip
                size="small"
                label={t(`lawyer_matching.${lawyer.verificationStatus}`)}
                color={getVerificationColor(lawyer.verificationStatus)}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {lawyer.specializations.slice(0, 3).map((spec) => (
                <Chip
                  key={spec}
                  size="small"
                  label={t(`legal_categories.${spec}`)}
                  variant="outlined"
                />
              ))}
              {lawyer.specializations.length > 3 && (
                <Chip
                  size="small"
                  label={`+${lawyer.specializations.length - 3} more`}
                  variant="outlined"
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Rating value={lawyer.ratings.average} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  ({lawyer.ratings.count})
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {lawyer.profile.experience} years exp.
              </Typography>
              
              <Typography variant="body2" color="primary" fontWeight="bold">
                {formatCurrency(lawyer.pricing.hourlyRate)}/hr
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {lawyer.location.city}, {lawyer.location.state}
              </Typography>
              
              <Chip
                size="small"
                label={t(`availability.${lawyer.availability.status}`)}
                color={getAvailabilityColor(lawyer.availability.status)}
                variant="filled"
              />
            </Box>
          </Grid>
          
          <Grid item>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowFullProfile(true)}
              >
                {t('lawyer_matching.view_profile')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onContact(lawyer)}
              >
                {t('lawyer_matching.contact')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const FullProfileDialog = () => (
    <Dialog
      open={showFullProfile}
      onClose={() => setShowFullProfile(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={lawyer.profile.avatar}
            sx={{ width: 60, height: 60 }}
          >
            {lawyer.profile.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5">{lawyer.profile.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={t(`lawyer_matching.${lawyer.verificationStatus}`)}
                color={getVerificationColor(lawyer.verificationStatus)}
                variant="outlined"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                Bar #: {lawyer.profile.barNumber}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Basic Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {t('lawyer_matching.basic_info')}
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <WorkIcon />
                </ListItemIcon>
                <ListItemText
                  primary={t('lawyer_matching.experience')}
                  secondary={`${lawyer.profile.experience} years`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <LocationIcon />
                </ListItemIcon>
                <ListItemText
                  primary={t('lawyer_matching.location')}
                  secondary={`${lawyer.location.city}, ${lawyer.location.state}`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText
                  primary={t('lawyer_matching.languages')}
                  secondary={lawyer.profile.languages.map(lang => t(`languages.${lang}`)).join(', ')}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <MoneyIcon />
                </ListItemIcon>
                <ListItemText
                  primary={t('lawyer_matching.hourly_rate')}
                  secondary={formatCurrency(lawyer.pricing.hourlyRate)}
                />
              </ListItem>
              
              {lawyer.pricing.consultationFee && (
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('lawyer_matching.consultation_fee')}
                    secondary={formatCurrency(lawyer.pricing.consultationFee)}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
          
          {/* Specializations & Rating */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {t('lawyer_matching.specializations')}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {lawyer.specializations.map((spec) => (
                <Chip
                  key={spec}
                  label={t(`legal_categories.${spec}`)}
                  variant="outlined"
                />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom>
              {t('lawyer_matching.rating_reviews')}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Rating value={lawyer.ratings.average} readOnly />
              <Typography variant="h6">{lawyer.ratings.average}</Typography>
              <Typography variant="body2" color="text.secondary">
                ({lawyer.ratings.count} {t('lawyer_matching.reviews')})
              </Typography>
            </Box>
          </Grid>
          
          {/* Bio */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              {t('lawyer_matching.about')}
            </Typography>
            <Typography variant="body1" paragraph>
              {lawyer.profile.bio}
            </Typography>
          </Grid>
          
          {/* Education */}
          {lawyer.profile.education && lawyer.profile.education.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('lawyer_matching.education')}
              </Typography>
              <List>
                {lawyer.profile.education.map((edu, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <SchoolIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={edu.degree}
                      secondary={`${edu.institution} (${edu.year})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
          
          {/* Availability */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              {t('lawyer_matching.availability')}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                label={t(`availability.${lawyer.availability.status}`)}
                color={getAvailabilityColor(lawyer.availability.status)}
                variant="filled"
              />
              
              {lawyer.availability.nextAvailable && (
                <Typography variant="body2" color="text.secondary">
                  {t('lawyer_matching.next_available')}: {new Date(lawyer.availability.nextAvailable).toLocaleDateString()}
                </Typography>
              )}
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {t('lawyer_matching.response_time')}: {lawyer.availability.responseTime}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setShowFullProfile(false)}>
          {t('common.close')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmailIcon />}
          onClick={() => onContact(lawyer)}
        >
          {t('lawyer_matching.contact')}
        </Button>
        <Button
          variant="contained"
          startIcon={<CalendarIcon />}
          onClick={() => onBookConsultation(lawyer)}
        >
          {t('lawyer_matching.book_consultation')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (compact) {
    return (
      <>
        <CompactView />
        <FullProfileDialog />
      </>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Full profile content would go here */}
        <Typography>Full profile view not implemented in compact mode</Typography>
      </CardContent>
    </Card>
  );
};

export default LawyerProfile;