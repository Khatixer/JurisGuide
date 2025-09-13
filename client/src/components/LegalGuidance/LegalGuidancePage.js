import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Snackbar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  History as HistoryIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import LegalQueryForm from './LegalQueryForm';
import GuidanceDisplay from './GuidanceDisplay';
import axios from 'axios';

const LegalGuidancePage = () => {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState('form'); // 'form', 'guidance', 'history'
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadQueryHistory();
  }, []);

  const loadQueryHistory = async () => {
    try {
      const response = await axios.get('/api/legal-queries/history');
      setQueryHistory(response.data);
    } catch (error) {
      console.error('Failed to load query history:', error);
    }
  };

  const handleQuerySubmit = async (queryData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Submit the legal query
      const queryResponse = await axios.post('/api/legal-queries', queryData);
      const queryId = queryResponse.data.id;

      // Get AI guidance for the query
      const guidanceResponse = await axios.post('/api/legal-guidance/generate', {
        queryId: queryId
      });

      setGuidance(guidanceResponse.data);
      setCompletedSteps([]);
      setCurrentView('guidance');
      setSuccess(t('legal_guidance.query_submitted_success'));
      
      // Refresh history
      loadQueryHistory();
    } catch (error) {
      console.error('Failed to submit query:', error);
      setError(error.response?.data?.message || t('legal_guidance.query_submit_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepIndex) => {
    if (!completedSteps.includes(stepIndex)) {
      const newCompletedSteps = [...completedSteps, stepIndex];
      setCompletedSteps(newCompletedSteps);
      
      // Save progress to backend
      try {
        await axios.patch(`/api/legal-guidance/${guidance.queryId}/progress`, {
          completedSteps: newCompletedSteps
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
  };

  const handleLoadHistoryItem = async (queryId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/legal-guidance/${queryId}`);
      setGuidance(response.data.guidance);
      setCompletedSteps(response.data.completedSteps || []);
      setCurrentView('guidance');
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load guidance:', error);
      setError(t('legal_guidance.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (queryId) => {
    try {
      await axios.delete(`/api/legal-queries/${queryId}`);
      loadQueryHistory();
      setSuccess(t('legal_guidance.query_deleted_success'));
    } catch (error) {
      console.error('Failed to delete query:', error);
      setError(t('legal_guidance.delete_error'));
    }
  };

  const handleNewQuery = () => {
    setCurrentView('form');
    setGuidance(null);
    setCompletedSteps([]);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'processing': 'info',
      'completed': 'success',
      'failed': 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {t('legal_guidance.page_title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('legal_guidance.page_subtitle')}
        </Typography>
      </Box>

      {/* Main Content */}
      {currentView === 'form' && (
        <LegalQueryForm 
          onSubmit={handleQuerySubmit}
          loading={loading}
        />
      )}

      {currentView === 'guidance' && guidance && (
        <GuidanceDisplay
          guidance={guidance}
          onStepComplete={handleStepComplete}
          completedSteps={completedSteps}
        />
      )}

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {currentView === 'guidance' && (
          <Fab
            color="primary"
            onClick={handleNewQuery}
            sx={{ mb: 1 }}
          >
            <AddIcon />
          </Fab>
        )}
        
        <Fab
          color="secondary"
          onClick={() => setShowHistory(true)}
        >
          <HistoryIcon />
        </Fab>
      </Box>

      {/* History Dialog */}
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('legal_guidance.query_history')}
        </DialogTitle>
        <DialogContent>
          {queryHistory.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('legal_guidance.no_history')}
            </Typography>
          ) : (
            <List>
              {queryHistory.map((query) => (
                <ListItem
                  key={query.id}
                  button
                  onClick={() => handleLoadHistoryItem(query.id)}
                  sx={{ border: '1px solid', borderColor: 'divider', mb: 1, borderRadius: 1 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {t(`legal_categories.${query.category}`)}
                        </Typography>
                        <Chip
                          size="small"
                          label={t(`query_status.${query.status}`)}
                          color={getStatusColor(query.status)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {query.description.substring(0, 100)}...
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(query.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistoryItem(query.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LegalGuidancePage;