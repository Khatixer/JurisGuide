import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Translate as TranslateIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import io from 'socket.io-client';

const MESSAGE_TYPES = {
  TEXT: 'text',
  DOCUMENT: 'document',
  PROPOSAL: 'proposal',
  SYSTEM: 'system',
  AI_SUGGESTION: 'ai_suggestion'
};

const MediationMessaging = ({ 
  caseId, 
  currentUser, 
  parties = [],
  onSendMessage,
  onFileUpload 
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [typing, setTyping] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('/mediation', {
      query: { caseId, userId: currentUser.id }
    });

    newSocket.on('connect', () => {
      console.log('Connected to mediation room');
    });

    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('typing', (data) => {
      setTyping(prev => {
        const filtered = prev.filter(t => t.userId !== data.userId);
        return data.isTyping ? [...filtered, data] : filtered;
      });
    });

    newSocket.on('message_status', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: data.status }
          : msg
      ));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [caseId, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      caseId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: newMessage,
      type: MESSAGE_TYPES.TEXT,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    try {
      if (socket) {
        socket.emit('send_message', message);
      }
      
      if (onSendMessage) {
        await onSendMessage(message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleTyping = (isTyping) => {
    if (socket) {
      socket.emit('typing', {
        userId: currentUser.id,
        userName: currentUser.name,
        isTyping
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);

      if (onFileUpload) {
        await onFileUpload(formData);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const handleTranslate = async (message) => {
    try {
      // In real app, this would call translation API
      setTranslatedText(`[Translated] ${message.content}`);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleMenuClick = (event, message) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const getMessageStatus = (message) => {
    switch (message.status) {
      case 'sending':
        return <ScheduleIcon fontSize="small" color="action" />;
      case 'sent':
        return <CheckCircleIcon fontSize="small" color="action" />;
      case 'delivered':
        return <CheckCircleIcon fontSize="small" color="primary" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return t('mediation.just_now');
    if (diffInMinutes < 60) return t('mediation.minutes_ago', { minutes: diffInMinutes });
    if (diffInMinutes < 1440) return t('mediation.hours_ago', { hours: Math.floor(diffInMinutes / 60) });
    return date.toLocaleDateString();
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === currentUser.id;
    const isSystemMessage = message.type === MESSAGE_TYPES.SYSTEM;
    const isAIMessage = message.type === MESSAGE_TYPES.AI_SUGGESTION;

    if (isSystemMessage) {
      return (
        <Box key={message.id} sx={{ textAlign: 'center', my: 2 }}>
          <Chip
            label={message.content}
            size="small"
            variant="outlined"
            sx={{ bgcolor: 'background.paper' }}
          />
        </Box>
      );
    }

    return (
      <ListItem
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          px: 1,
          py: 0.5
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            mx: 1,
            bgcolor: isAIMessage ? 'secondary.main' : 'primary.main'
          }}
        >
          {isAIMessage ? 'AI' : message.senderName.charAt(0)}
        </Avatar>

        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            maxWidth: '70%',
            bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
            color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            position: 'relative'
          }}
        >
          {!isOwnMessage && (
            <Typography variant="caption" color="text.secondary" display="block">
              {message.senderName}
            </Typography>
          )}

          <Typography variant="body1" sx={{ mb: 0.5 }}>
            {message.content}
          </Typography>

          {message.type === MESSAGE_TYPES.PROPOSAL && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label={t('mediation.proposal')}
                size="small"
                color="warning"
                variant="outlined"
              />
            </Box>
          )}

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 0.5
          }}>
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(message.timestamp)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isOwnMessage && getMessageStatus(message)}
              
              <IconButton
                size="small"
                onClick={(event) => handleMenuClick(event, message)}
                sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Messages List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List sx={{ py: 0 }}>
          {messages.map(renderMessage)}
          
          {/* Typing Indicators */}
          {typing.map((typingUser) => (
            <ListItem key={typingUser.userId} sx={{ py: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                {typingUser.userName.charAt(0)}
              </Avatar>
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {typingUser.userName} {t('mediation.is_typing')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.2 }}>
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: 'text.secondary',
                        animation: 'pulse 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            </ListItem>
          ))}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Message Input */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={t('mediation.type_message')}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping(e.target.value.length > 0);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            variant="outlined"
            size="small"
          />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />

          <Tooltip title={t('mediation.attach_file')}>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              color="primary"
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            {t('mediation.send')}
          </Button>
        </Box>
      </Box>

      {/* Message Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          // Handle reply
          handleMenuClose();
        }}>
          <ReplyIcon sx={{ mr: 1 }} />
          {t('mediation.reply')}
        </MenuItem>
        
        {selectedMessage && selectedMessage.senderId !== currentUser.id && (
          <MenuItem onClick={() => {
            handleTranslate(selectedMessage);
            handleMenuClose();
          }}>
            <TranslateIcon sx={{ mr: 1 }} />
            {t('mediation.translate')}
          </MenuItem>
        )}
      </Menu>

      {/* Translation Dialog */}
      <Dialog
        open={showTranslation}
        onClose={() => setShowTranslation(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('mediation.translation')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {translatedText}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTranslation(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MediationMessaging;