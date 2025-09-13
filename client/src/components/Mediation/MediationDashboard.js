import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Message as MessageIcon,
  Description as DocumentIcon,
  Gavel as GavelIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  TrendingUp as ProgressIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import MediationCaseCard from './MediationCaseCard';
import CreateMediationDialog from './CreateMediationDialog';

const MediationDashboard = ({ cases = [], onCaseSelect, onCreateCase }) => {
  const { t } = useTranslation();
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuCaseId, setMenuCaseId] = useState(null);

  const handleCaseClick = (caseItem) => {
    setSelectedCase(caseItem);
    onCaseSelect(caseItem);
  };

  const handleMenuClick = (event, caseId) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuCaseId(caseId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuCaseId(null);
  };

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

  const getProgressPercentage = (caseItem) => {
    if (!caseItem.timeline || caseItem.timeline.length === 0) return 0;
    
    const totalSteps = 5; // Typical mediation steps
    const completedSteps = caseItem.timeline.filter(event => 
      event.type === 'milestone' || event.type === 'agreement'
    ).length;
    
    return Math.min((completedSteps / totalSteps) * 100, 100);
  };

  const activeCases = cases.filter(c => c.status === 'active');
  const pendingCases = cases.filter(c => c.status === 'pending');
  const resolvedCases = cases.filter(c => c.status === 'resolved');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('mediation.dashboard_title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateDialog(true)}
        >
          {t('mediation.start_new_case')}
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <GavelIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{activeCases.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('mediation.active_cases')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{pendingCases.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('mediation.pending_cases')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <ProgressIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{resolvedCases.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('mediation.resolved_cases')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <GroupIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {cases.reduce((total, c) => total + (c.parties?.length || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('mediation.total_parties')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Cases */}
      {activeCases.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            {t('mediation.active_cases')}
          </Typography>
          <Grid container spacing={2}>
            {activeCases.map((caseItem) => (
              <Grid item xs={12} md={6} lg={4} key={caseItem.id}>
                <MediationCaseCard
                  case={caseItem}
                  onClick={() => handleCaseClick(caseItem)}
                  onMenuClick={(event) => handleMenuClick(event, caseItem.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('mediation.recent_activity')}
              </Typography>
              
              {cases.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <GavelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {t('mediation.no_cases')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('mediation.no_cases_description')}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {cases.slice(0, 5).map((caseItem, index) => (
                    <React.Fragment key={caseItem.id}>
                      <ListItem
                        button
                        onClick={() => handleCaseClick(caseItem)}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getStatusColor(caseItem.status) + '.main' }}>
                            <GavelIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                {caseItem.dispute.summary.substring(0, 50)}...
                              </Typography>
                              <Chip
                                size="small"
                                label={t(`mediation.status.${caseItem.status}`)}
                                color={getStatusColor(caseItem.status)}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {caseItem.parties.length} {t('mediation.parties')} • 
                                {t(`legal_categories.${caseItem.dispute.category}`)}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {t('mediation.progress')}:
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={getProgressPercentage(caseItem)}
                                  sx={{ flexGrow: 1, height: 4, borderRadius: 2 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {Math.round(getProgressPercentage(caseItem))}%
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                        <IconButton
                          onClick={(event) => handleMenuClick(event, caseItem.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </ListItem>
                      {index < Math.min(cases.length - 1, 4) && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('mediation.quick_actions')}
              </Typography>
              
              <List>
                <ListItem button onClick={() => setShowCreateDialog(true)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <AddIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={t('mediation.start_new_case')}
                    secondary={t('mediation.start_new_case_description')}
                  />
                </ListItem>
                
                <ListItem button>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <MessageIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={t('mediation.view_messages')}
                    secondary={t('mediation.view_messages_description')}
                  />
                </ListItem>
                
                <ListItem button>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <DocumentIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={t('mediation.view_documents')}
                    secondary={t('mediation.view_documents_description')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <MessageIcon sx={{ mr: 1 }} />
          {t('mediation.send_message')}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <DocumentIcon sx={{ mr: 1 }} />
          {t('mediation.view_documents')}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ProgressIcon sx={{ mr: 1 }} />
          {t('mediation.view_progress')}
        </MenuItem>
      </Menu>

      {/* Create Mediation Dialog */}
      <CreateMediationDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={onCreateCase}
      />
    </Box>
  );
};

export default MediationDashboard;