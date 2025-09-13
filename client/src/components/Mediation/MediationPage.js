import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  Description as DocumentIcon,
  Timeline as TimelineIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import MediationDashboard from './MediationDashboard';
import MediationMessaging from './MediationMessaging';
import DocumentSharing from './DocumentSharing';
import axios from 'axios';

const MediationPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCase, setSelectedCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Mock current user - in real app this would come from auth context
  const currentUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'client'
  };

  useEffect(() => {
    loadMediationCases();
  }, []);

  const loadMediationCases = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/mediation/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Failed to load mediation cases:', error);
      // Use mock data for demo
      setCases([
        {
          id: 'case-1',
          dispute: {
            summary: 'Contract dispute regarding software development services',
            category: 'contract_dispute',
            jurisdiction: ['US-California'],
            culturalFactors: ['western_individualistic']
          },
          parties: [
            { id: 'party-1', name: 'John Doe', email: 'john@example.com', role: 'complainant' },
            { id: 'party-2', name: 'Jane Smith', email: 'jane@example.com', role: 'respondent' }
          ],
          status: 'active',
          timeline: [
            {
              timestamp: new Date().toISOString(),
              type: 'case_created',
              content: 'Mediation case created'
            }
          ],
          documents: []
        },
        {
          id: 'case-2',
          dispute: {
            summary: 'Employment termination dispute',
            category: 'employment_dispute',
            jurisdiction: ['US-New York'],
            culturalFactors: []
          },
          parties: [
            { id: 'party-3', name: 'Alice Johnson', email: 'alice@example.com', role: 'complainant' },
            { id: 'party-4', name: 'Bob Wilson', email: 'bob@example.com', role: 'respondent' }
          ],
          status: 'pending',
          timeline: [],
          documents: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseSelect = (caseItem) => {
    setSelectedCase(caseItem);
    setActiveTab(1); // Switch to messaging tab
  };

  const handleCreateCase = async (caseData) => {
    try {
      const response = await axios.post('/api/mediation/cases', caseData);
      setCases(prev => [...prev, response.data]);
      setSuccess(t('mediation.case_created_success'));
    } catch (error) {
      console.error('Failed to create case:', error);
      setError(t('mediation.case_creation_error'));
    }
  };

  const handleSendMessage = async (message) => {
    try {
      await axios.post(`/api/mediation/cases/${selectedCase.id}/messages`, message);
      // Message will be added via socket.io in real implementation
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const handleFileUpload = async (formData) => {
    try {
      const response = await axios.post(
        `/api/mediation/cases/${selectedCase.id}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Update case documents
      setSelectedCase(prev => ({
        ...prev,
        documents: [...(prev.documents || []), response.data]
      }));
      
      setSuccess(t('mediation.document_uploaded_success'));
    } catch (error) {
      console.error('Failed to upload document:', error);
      setError(t('mediation.document_upload_error'));
    }
  };

  const handleDocumentDelete = async (document) => {
    try {
      await axios.delete(`/api/mediation/documents/${document.id}`);
      
      setSelectedCase(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== document.id)
      }));
      
      setSuccess(t('mediation.document_deleted_success'));
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError(t('mediation.document_delete_error'));
    }
  };

  const handleDocumentShare = async (documentId, shareData) => {
    try {
      await axios.post(`/api/mediation/documents/${documentId}/share`, shareData);
      setSuccess(t('mediation.document_shared_success'));
    } catch (error) {
      console.error('Failed to share document:', error);
      setError(t('mediation.document_share_error'));
    }
  };

  const handleDocumentDownload = async (document) => {
    try {
      const response = await axios.get(`/api/mediation/documents/${document.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download document:', error);
      setError(t('mediation.document_download_error'));
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <MediationDashboard
            cases={cases}
            onCaseSelect={handleCaseSelect}
            onCreateCase={handleCreateCase}
          />
        );
      
      case 1:
        if (!selectedCase) {
          return (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  {t('mediation.select_case_for_messaging')}
                </Typography>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Paper sx={{ height: '70vh' }}>
            <MediationMessaging
              caseId={selectedCase.id}
              currentUser={currentUser}
              parties={selectedCase.parties}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
            />
          </Paper>
        );
      
      case 2:
        if (!selectedCase) {
          return (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  {t('mediation.select_case_for_documents')}
                </Typography>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <DocumentSharing
            caseId={selectedCase.id}
            documents={selectedCase.documents || []}
            currentUser={currentUser}
            parties={selectedCase.parties}
            onUpload={handleFileUpload}
            onDelete={handleDocumentDelete}
            onShare={handleDocumentShare}
            onDownload={handleDocumentDownload}
          />
        );
      
      case 3:
        return (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {t('mediation.timeline_coming_soon')}
              </Typography>
            </CardContent>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          href="/dashboard"
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {t('navigation.dashboard')}
        </Link>
        <Typography
          sx={{ display: 'flex', alignItems: 'center' }}
          color="text.primary"
        >
          <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {t('navigation.mediation')}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {t('mediation.page_title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('mediation.page_subtitle')}
        </Typography>
      </Box>

      {/* Selected Case Info */}
      {selectedCase && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            {t('mediation.active_case')}: {selectedCase.dispute.summary}
          </Typography>
          <Typography variant="body2">
            {selectedCase.parties.length} {t('mediation.parties')} • 
            {t(`mediation.status.${selectedCase.status}`)} • 
            {t(`legal_categories.${selectedCase.dispute.category}`)}
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab
            icon={<DashboardIcon />}
            label={t('mediation.dashboard')}
            iconPosition="start"
          />
          <Tab
            icon={<MessageIcon />}
            label={t('mediation.messages')}
            iconPosition="start"
          />
          <Tab
            icon={<DocumentIcon />}
            label={t('mediation.documents')}
            iconPosition="start"
          />
          <Tab
            icon={<TimelineIcon />}
            label={t('mediation.timeline')}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {renderTabContent()}

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

export default MediationPage;