import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Gavel as GavelIcon,
  Language as LanguageIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import LegalTermTooltip from './LegalTermTooltip';

const GuidanceDisplay = ({ guidance, onStepComplete, completedSteps = [] }) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    culturalConsiderations: false,
    applicableLaws: false,
    nextActions: false
  });

  const handleStepClick = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  const handleStepComplete = (stepIndex) => {
    onStepComplete(stepIndex);
    if (stepIndex < guidance.steps.length - 1) {
      setActiveStep(stepIndex + 1);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStepIcon = (stepIndex) => {
    if (completedSteps.includes(stepIndex)) {
      return <CheckCircleIcon color="success" />;
    }
    return stepIndex + 1;
  };

  const calculateProgress = () => {
    return (completedSteps.length / guidance.steps.length) * 100;
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" component="h2">
              {t('guidance.title')}
            </Typography>
            <Chip
              label={`${Math.round(guidance.confidence * 100)}% ${t('guidance.confidence')}`}
              color={guidance.confidence > 0.8 ? 'success' : guidance.confidence > 0.6 ? 'warning' : 'error'}
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('guidance.progress_label')}: {completedSteps.length} / {guidance.steps.length}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={calculateProgress()} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {guidance.confidence < 0.7 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t('guidance.low_confidence_warning')}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step-by-Step Guidance */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('guidance.steps_title')}
          </Typography>
          
          <Stepper activeStep={activeStep} orientation="vertical">
            {guidance.steps.map((step, index) => (
              <Step key={index} completed={completedSteps.includes(index)}>
                <StepLabel
                  icon={getStepIcon(index)}
                  onClick={() => handleStepClick(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      <LegalTermTooltip text={step.title} />
                    </Typography>
                    {step.jurisdictionSpecific && (
                      <Tooltip title={t('guidance.jurisdiction_specific')}>
                        <LocationIcon fontSize="small" color="primary" />
                      </Tooltip>
                    )}
                  </Box>
                </StepLabel>
                
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" paragraph>
                      <LegalTermTooltip text={step.description} />
                    </Typography>
                    
                    {step.timeframe && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {t('guidance.timeframe')}: {step.timeframe}
                        </Typography>
                      </Box>
                    )}

                    {step.resources && step.resources.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {t('guidance.resources')}:
                        </Typography>
                        <List dense>
                          {step.resources.map((resource, resourceIndex) => (
                            <ListItem key={resourceIndex} sx={{ pl: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <InfoIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={resource.title}
                                secondary={resource.description}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!completedSteps.includes(index) && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleStepComplete(index)}
                        >
                          {t('guidance.mark_complete')}
                        </Button>
                      )}
                      
                      {index > 0 && (
                        <Button
                          size="small"
                          onClick={() => setActiveStep(index - 1)}
                        >
                          {t('guidance.previous_step')}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Cultural Considerations */}
      {guidance.culturalConsiderations && guidance.culturalConsiderations.length > 0 && (
        <Accordion 
          expanded={expandedSections.culturalConsiderations}
          onChange={() => toggleSection('culturalConsiderations')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LanguageIcon color="primary" />
              <Typography variant="h6">
                {t('guidance.cultural_considerations')}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {guidance.culturalConsiderations.map((consideration, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={consideration} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Applicable Laws */}
      {guidance.applicableLaws && guidance.applicableLaws.length > 0 && (
        <Accordion 
          expanded={expandedSections.applicableLaws}
          onChange={() => toggleSection('applicableLaws')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GavelIcon color="primary" />
              <Typography variant="h6">
                {t('guidance.applicable_laws')}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {guidance.applicableLaws.map((law, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemText
                    primary={law.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {law.description}
                        </Typography>
                        {law.jurisdiction && (
                          <Chip
                            size="small"
                            label={law.jurisdiction}
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Next Actions */}
      {guidance.nextActions && guidance.nextActions.length > 0 && (
        <Accordion 
          expanded={expandedSections.nextActions}
          onChange={() => toggleSection('nextActions')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              {t('guidance.next_actions')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {guidance.nextActions.map((action, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="action" />
                  </ListItemIcon>
                  <ListItemText primary={action} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default GuidanceDisplay;