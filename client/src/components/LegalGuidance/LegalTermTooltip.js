import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Chip,
  ClickAwayListener,
  Paper,
  Popper,
  Fade
} from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';

// Common legal terms and their plain language explanations
const LEGAL_TERMS = {
  'plaintiff': {
    definition: 'The person who brings a case against another in a court of law',
    plainLanguage: 'The person suing someone else',
    category: 'litigation'
  },
  'defendant': {
    definition: 'An individual, company, or institution sued or accused in a court of law',
    plainLanguage: 'The person being sued',
    category: 'litigation'
  },
  'jurisdiction': {
    definition: 'The official power to make legal decisions and judgments',
    plainLanguage: 'Which court or legal system has authority over your case',
    category: 'general'
  },
  'statute of limitations': {
    definition: 'A law that sets the maximum time after an event within which legal proceedings may be initiated',
    plainLanguage: 'The deadline for filing a lawsuit',
    category: 'general'
  },
  'breach of contract': {
    definition: 'Violation of any of the agreed-upon terms and conditions of a binding contract',
    plainLanguage: 'Breaking the promises made in an agreement',
    category: 'contract'
  },
  'negligence': {
    definition: 'Failure to take proper care in doing something, resulting in damage or injury',
    plainLanguage: 'Not being careful enough and causing harm to someone',
    category: 'tort'
  },
  'liability': {
    definition: 'The state of being responsible for something, especially by law',
    plainLanguage: 'Being legally responsible for damages or harm',
    category: 'general'
  },
  'damages': {
    definition: 'A sum of money claimed or awarded in compensation for a loss or injury',
    plainLanguage: 'Money paid to make up for harm or loss',
    category: 'general'
  },
  'injunction': {
    definition: 'An authoritative warning or order to stop doing something',
    plainLanguage: 'A court order to stop or start doing something',
    category: 'litigation'
  },
  'settlement': {
    definition: 'An official agreement intended to resolve a dispute or conflict',
    plainLanguage: 'An agreement to end a legal dispute without going to trial',
    category: 'litigation'
  },
  'mediation': {
    definition: 'Intervention between conflicting parties to promote reconciliation, settlement, or compromise',
    plainLanguage: 'Having a neutral person help resolve a dispute',
    category: 'adr'
  },
  'arbitration': {
    definition: 'The use of an arbitrator to settle a dispute',
    plainLanguage: 'Having a neutral person make a binding decision to resolve a dispute',
    category: 'adr'
  },
  'due process': {
    definition: 'Fair treatment through the normal judicial system',
    plainLanguage: 'The right to fair legal procedures',
    category: 'constitutional'
  },
  'precedent': {
    definition: 'An earlier event or action that is regarded as an example or guide to be considered in subsequent similar circumstances',
    plainLanguage: 'A previous court decision that guides future similar cases',
    category: 'general'
  },
  'burden of proof': {
    definition: 'The obligation to prove one\'s assertion',
    plainLanguage: 'The responsibility to provide evidence for your claims',
    category: 'litigation'
  }
};

const LegalTermTooltip = ({ text, interactive = true }) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [hoveredTerm, setHoveredTerm] = useState(null);
  const [processedText, setProcessedText] = useState('');

  useEffect(() => {
    // Process text to identify legal terms
    let processed = text;
    const foundTerms = [];

    Object.keys(LEGAL_TERMS).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(processed)) {
        foundTerms.push(term);
        processed = processed.replace(regex, `<legal-term data-term="${term}">$&</legal-term>`);
      }
    });

    setProcessedText(processed);
  }, [text]);

  const handleTermClick = (event, term) => {
    if (!interactive) return;
    
    setAnchorEl(event.currentTarget);
    setHoveredTerm(term);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setHoveredTerm(null);
  };

  const renderProcessedText = () => {
    const parts = processedText.split(/(<legal-term[^>]*>.*?<\/legal-term>)/g);
    
    return parts.map((part, index) => {
      const termMatch = part.match(/<legal-term data-term="([^"]*)">(.*?)<\/legal-term>/);
      
      if (termMatch) {
        const [, termKey, termText] = termMatch;
        const termData = LEGAL_TERMS[termKey.toLowerCase()];
        
        if (termData && interactive) {
          return (
            <Box
              key={index}
              component="span"
              sx={{
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                cursor: 'help',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText'
                }
              }}
              onClick={(e) => handleTermClick(e, termData)}
            >
              {termText}
            </Box>
          );
        }
        return termText;
      }
      
      return part;
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'litigation': 'error',
      'contract': 'primary',
      'tort': 'warning',
      'general': 'info',
      'adr': 'success',
      'constitutional': 'secondary'
    };
    return colors[category] || 'default';
  };

  return (
    <>
      <Typography component="span" variant="inherit">
        {renderProcessedText()}
      </Typography>

      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="top"
        transition
        sx={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper
              elevation={8}
              sx={{
                p: 2,
                maxWidth: 300,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  {hoveredTerm && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <HelpIcon fontSize="small" color="primary" />
                        <Chip
                          size="small"
                          label={t(`legal_categories.${hoveredTerm.category}`)}
                          color={getCategoryColor(hoveredTerm.category)}
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        {t('legal_terms.plain_language')}:
                      </Typography>
                      <Typography variant="body2" color="primary" paragraph>
                        {hoveredTerm.plainLanguage}
                      </Typography>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        {t('legal_terms.legal_definition')}:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {hoveredTerm.definition}
                      </Typography>
                    </>
                  )}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default LegalTermTooltip;