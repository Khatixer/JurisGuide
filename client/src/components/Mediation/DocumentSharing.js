import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Alert,
  Menu,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';

const DOCUMENT_TYPES = {
  PDF: 'pdf',
  DOC: 'doc',
  IMAGE: 'image',
  TEXT: 'text',
  OTHER: 'other'
};

const PERMISSION_LEVELS = [
  { value: 'view', label: 'View Only', icon: ViewIcon },
  { value: 'comment', label: 'View & Comment', icon: EditIcon },
  { value: 'edit', label: 'Full Edit', icon: EditIcon }
];

const DocumentSharing = ({ 
  caseId, 
  documents = [], 
  currentUser,
  parties = [],
  onUpload,
  onDelete,
  onShare,
  onDownload 
}) => {
  const { t } = useTranslation();
  const [uploadDialog, setUploadDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuDocument, setMenuDocument] = useState(null);
  const fileInputRef = useRef(null);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'evidence',
    permissions: 'view',
    allowedParties: []
  });

  const [shareForm, setShareForm] = useState({
    permissions: 'view',
    allowedParties: [],
    expiryDate: '',
    password: ''
  });

  const getDocumentIcon = (type, mimeType) => {
    if (type === DOCUMENT_TYPES.PDF || mimeType?.includes('pdf')) {
      return <PdfIcon color="error" />;
    }
    if (type === DOCUMENT_TYPES.IMAGE || mimeType?.startsWith('image/')) {
      return <ImageIcon color="primary" />;
    }
    if (type === DOCUMENT_TYPES.DOC || mimeType?.includes('document')) {
      return <DocumentIcon color="info" />;
    }
    return <DocumentIcon color="action" />;
  };

  const getDocumentType = (fileName, mimeType) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['pdf'].includes(extension)) return DOCUMENT_TYPES.PDF;
    if (['doc', 'docx'].includes(extension)) return DOCUMENT_TYPES.DOC;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return DOCUMENT_TYPES.IMAGE;
    if (['txt'].includes(extension)) return DOCUMENT_TYPES.TEXT;
    return DOCUMENT_TYPES.OTHER;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setUploadForm(prev => ({
        ...prev,
        title: files[0].name.split('.')[0],
        files: files
      }));
      setUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.files || uploadForm.files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      uploadForm.files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('caseId', caseId);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);
      formData.append('permissions', uploadForm.permissions);
      formData.append('allowedParties', JSON.stringify(uploadForm.allowedParties));

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      if (onUpload) {
        await onUpload(formData);
      }

      setUploadProgress(100);
      setTimeout(() => {
        setUploadDialog(false);
        setUploadForm({
          title: '',
          description: '',
          category: 'evidence',
          permissions: 'view',
          allowedParties: []
        });
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleShare = async () => {
    try {
      if (onShare) {
        await onShare(selectedDocument.id, shareForm);
      }
      setShareDialog(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleMenuClick = (event, document) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuDocument(null);
  };

  const canEdit = (document) => {
    return document.uploadedBy === currentUser.id || 
           document.permissions?.includes('edit') ||
           currentUser.role === 'admin';
  };

  const canDelete = (document) => {
    return document.uploadedBy === currentUser.id || 
           currentUser.role === 'admin';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          {t('mediation.documents')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          />
          
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('mediation.upload_document')}
          </Button>
        </Box>
      </Box>

      {/* Document Categories */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['evidence', 'agreements', 'correspondence', 'reports'].map((category) => {
          const categoryDocs = documents.filter(doc => doc.category === category);
          return (
            <Grid item xs={12} sm={6} md={3} key={category}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">
                    {categoryDocs.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`mediation.document_categories.${category}`)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('mediation.no_documents')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('mediation.no_documents_description')}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <List>
            {documents.map((document, index) => (
              <React.Fragment key={document.id}>
                <ListItem>
                  <ListItemIcon>
                    {getDocumentIcon(
                      getDocumentType(document.fileName, document.mimeType),
                      document.mimeType
                    )}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {document.title || document.fileName}
                        </Typography>
                        
                        <Chip
                          size="small"
                          label={t(`mediation.document_categories.${document.category}`)}
                          variant="outlined"
                        />
                        
                        {document.isPrivate ? (
                          <LockIcon fontSize="small" color="action" />
                        ) : (
                          <PublicIcon fontSize="small" color="action" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {document.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(document.size)} • 
                            {new Date(document.uploadedAt).toLocaleDateString()} • 
                            {document.uploadedByName}
                          </Typography>
                          
                          {document.sharedWith && document.sharedWith.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupIcon fontSize="small" color="action" />
                              <Typography variant="caption" color="text.secondary">
                                {document.sharedWith.length} {t('mediation.shared_with')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        onClick={() => onDownload && onDownload(document)}
                        size="small"
                      >
                        <DownloadIcon />
                      </IconButton>
                      
                      <IconButton
                        onClick={() => {
                          setSelectedDocument(document);
                          setShareDialog(true);
                        }}
                        size="small"
                      >
                        <ShareIcon />
                      </IconButton>
                      
                      <IconButton
                        onClick={(event) => handleMenuClick(event, document)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < documents.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialog}
        onClose={() => !uploading && setUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('mediation.upload_document')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('mediation.document_title')}
            value={uploadForm.title}
            onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('mediation.document_description')}
            value={uploadForm.description}
            onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('mediation.document_category')}</InputLabel>
            <Select
              value={uploadForm.category}
              onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
              label={t('mediation.document_category')}
            >
              <MenuItem value="evidence">{t('mediation.document_categories.evidence')}</MenuItem>
              <MenuItem value="agreements">{t('mediation.document_categories.agreements')}</MenuItem>
              <MenuItem value="correspondence">{t('mediation.document_categories.correspondence')}</MenuItem>
              <MenuItem value="reports">{t('mediation.document_categories.reports')}</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('mediation.default_permissions')}</InputLabel>
            <Select
              value={uploadForm.permissions}
              onChange={(e) => setUploadForm(prev => ({ ...prev, permissions: e.target.value }))}
              label={t('mediation.default_permissions')}
            >
              {PERMISSION_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                {t('mediation.uploading')}: {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !uploadForm.title.trim()}
          >
            {uploading ? t('mediation.uploading') : t('mediation.upload')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialog}
        onClose={() => setShareDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('mediation.share_document')}: {selectedDocument?.title}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('mediation.share_document_info')}
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('mediation.permission_level')}</InputLabel>
            <Select
              value={shareForm.permissions}
              onChange={(e) => setShareForm(prev => ({ ...prev, permissions: e.target.value }))}
              label={t('mediation.permission_level')}
            >
              {PERMISSION_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            type="date"
            label={t('mediation.expiry_date')}
            value={shareForm.expiryDate}
            onChange={(e) => setShareForm(prev => ({ ...prev, expiryDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label={t('mediation.password_protection')}
            type="password"
            value={shareForm.password}
            onChange={(e) => setShareForm(prev => ({ ...prev, password: e.target.value }))}
            helperText={t('mediation.password_protection_help')}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShareDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleShare} variant="contained">
            {t('mediation.share')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ViewIcon sx={{ mr: 1 }} />
          {t('mediation.view_document')}
        </MenuItem>
        
        {canEdit(menuDocument) && (
          <MenuItem onClick={handleMenuClose}>
            <EditIcon sx={{ mr: 1 }} />
            {t('mediation.edit_document')}
          </MenuItem>
        )}
        
        {canDelete(menuDocument) && (
          <MenuItem
            onClick={() => {
              onDelete && onDelete(menuDocument);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            {t('mediation.delete_document')}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default DocumentSharing;