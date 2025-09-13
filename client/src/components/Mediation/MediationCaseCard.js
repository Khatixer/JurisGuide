import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  Avatar,
  AvatarGroup,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';

const MediationCaseCard = ({ case: caseItem, onClick, onMenuClick }) => {
  const { t } = useTranslation();

  const getStatusColor = (status) => {
    const colors = {
      'active': 'primary',
      'pending': 'warning',
      'resolved': 'success',
      'failed': 'error',
      'escalated': 'secondary'
    };
    return colors[status] || 'default';
  };

  const getProgressPercentage = () => {
    if (!caseItem.timeline || caseItem.timeline.length === 0) return 0;
    
    const totalSteps = 5;
    const completedSteps = caseItem.timeline.filter(event => 
      event.type === 'milestone' || event.type === 'agreement'
    ).length;
    
    return Math.min((completedSteps / totalSteps) * 100, 100);
  };

  const getLastActivity = () => {
    if (!caseItem.timeline || caseItem.timeline.length === 0) {
      return t('mediation.no_activity');
    }
    
    const lastEvent = caseItem.timeline[caseItem.timeline.length - 1];
    const date = new Date(lastEvent.timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return t('mediation.activity_just_now');
    } else if (diffInHours < 24) {
      return t('mediation.activity_hours_ago', { hours: diffInHours });
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return t('mediation.activity_days_ago', { days: diffInDays });
    }
  };

  const getUnreadCount = () => {
    // In a real app, this would come from the case data
    return Math.floor(Math.random() * 5);
  };

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 4,
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.2s ease-in-out'
      }}
      onClick={onClick}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" noWrap>
              {caseItem.dispute.summary.substring(0, 40)}...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(`legal_categories.${caseItem.dispute.category}`)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={t(`mediation.status.${caseItem.status}`)}
              color={getStatusColor(caseItem.status)}
              variant="outlined"
            />
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onMenuClick(event);
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Parties */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <GroupIcon fontSize="small" color="action" />
          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
            {caseItem.parties.map((party, index) => (
              <Avatar key={index} sx={{ bgcolor: `hsl(${index * 137.5}, 50%, 50%)` }}>
                {party.name.charAt(0)}
              </Avatar>
            ))}
          </AvatarGroup>
          <Typography variant="body2" color="text.secondary">
            {caseItem.parties.length} {t('mediation.parties')}
          </Typography>
        </Box>

        {/* Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('mediation.progress')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(getProgressPercentage())}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={getProgressPercentage()}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Last Activity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {getLastActivity()}
          </Typography>
        </Box>

        {/* Jurisdiction */}
        {caseItem.dispute.jurisdiction && caseItem.dispute.jurisdiction.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('mediation.jurisdiction')}:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {caseItem.dispute.jurisdiction.slice(0, 2).map((jurisdiction) => (
                <Chip
                  key={jurisdiction}
                  size="small"
                  label={jurisdiction}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {caseItem.dispute.jurisdiction.length > 2 && (
                <Chip
                  size="small"
                  label={`+${caseItem.dispute.jurisdiction.length - 2}`}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<MessageIcon />}
          onClick={(event) => {
            event.stopPropagation();
            // Handle message action
          }}
        >
          {t('mediation.messages')}
          {getUnreadCount() > 0 && (
            <Chip
              size="small"
              label={getUnreadCount()}
              color="error"
              sx={{ ml: 1, minWidth: 20, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Button>
        
        <Typography variant="caption" color="text.secondary">
          {t('mediation.case_id')}: {caseItem.id.substring(0, 8)}
        </Typography>
      </CardActions>
    </Card>
  );
};

export default MediationCaseCard;