const express = require('express');
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { getRequests, saveRequests, getDepartments, getUsers, getNextId } = require('../database/init');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Create request
router.post('/', authenticateToken, upload.single('attachment'), (req, res) => {
  const { title, description, departmentId } = req.body;
  const clientId = req.user.userId;
  const attachmentPath = req.file ? req.file.filename : null;

  try {
    const requests = getRequests();
    const newRequest = {
      id: getNextId(requests),
      title,
      description,
      status: 'pending',
      client_id: clientId,
      department_id: parseInt(departmentId),
      attachment_path: attachmentPath,
      response_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    requests.push(newRequest);
    saveRequests(requests);

    res.status(201).json({
      message: 'Request created successfully',
      requestId: newRequest.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Get user's requests (for clients)
router.get('/my-requests', authenticateToken, (req, res) => {
  const clientId = req.user.userId;
  
  try {
    const requests = getRequests();
    const departments = getDepartments();
    
    const userRequests = requests
      .filter(r => r.client_id === clientId)
      .map(r => {
        const dept = departments.find(d => d.id === r.department_id);
        return {
          ...r,
          department_name: dept ? dept.name : 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(userRequests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get department requests (for department users)
router.get('/department/:departmentId', authenticateToken, (req, res) => {
  const { departmentId } = req.params;
  
  try {
    const requests = getRequests();
    const users = getUsers();
    
    const deptRequests = requests
      .filter(r => r.department_id === parseInt(departmentId))
      .map(r => {
        const user = users.find(u => u.id === r.client_id);
        return {
          ...r,
          client_name: user ? user.name : 'Unknown',
          client_email: user ? user.email : 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(deptRequests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Update request status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, responseMessage } = req.body;

  try {
    const requests = getRequests();
    const requestIndex = requests.findIndex(r => r.id === parseInt(id));
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    requests[requestIndex].status = status;
    requests[requestIndex].response_message = responseMessage || null;
    requests[requestIndex].updated_at = new Date().toISOString();

    saveRequests(requests);

    res.json({ message: 'Request updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;