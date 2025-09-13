const express = require('express');
const { getDepartments, getRequests, getNextId } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();
const departmentsFile = path.join(__dirname, '../database/departments.json');

// Get all departments
router.get('/', (req, res) => {
  try {
    const departments = getDepartments();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Add new department (Admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, description, contact_info } = req.body;
  
  try {
    const departments = getDepartments();
    
    // Check if department already exists
    if (departments.find(dept => dept.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Department already exists' });
    }
    
    const newDepartment = {
      id: getNextId(departments),
      name,
      description,
      contact_info,
      created_at: new Date().toISOString()
    };
    
    departments.push(newDepartment);
    fs.writeJsonSync(departmentsFile, departments);
    
    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department (Admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, contact_info } = req.body;
  
  try {
    const departments = getDepartments();
    const deptIndex = departments.findIndex(dept => dept.id === parseInt(id));
    
    if (deptIndex === -1) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Check if new name conflicts with existing departments (excluding current one)
    const existingDept = departments.find(dept => 
      dept.name.toLowerCase() === name.toLowerCase() && dept.id !== parseInt(id)
    );
    
    if (existingDept) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    
    // Update department
    departments[deptIndex] = {
      ...departments[deptIndex],
      name,
      description,
      contact_info,
      updated_at: new Date().toISOString()
    };
    
    fs.writeJsonSync(departmentsFile, departments);
    
    res.json({
      message: 'Department updated successfully',
      department: departments[deptIndex]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    const departments = getDepartments();
    const deptIndex = departments.findIndex(dept => dept.id === parseInt(id));
    
    if (deptIndex === -1) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Check if department has active requests or users
    const requests = getRequests();
    const hasActiveRequests = requests.some(req => req.department_id === parseInt(id));
    
    if (hasActiveRequests) {
      return res.status(400).json({ 
        error: 'Cannot delete department with active requests. Please resolve all requests first.' 
      });
    }
    
    // Remove department
    const deletedDept = departments.splice(deptIndex, 1)[0];
    fs.writeJsonSync(departmentsFile, departments);
    
    res.json({
      message: 'Department deleted successfully',
      department: deletedDept
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// Get department analytics
router.get('/:id/analytics', (req, res) => {
  const { id } = req.params;
  
  try {
    const requests = getRequests();
    const deptId = parseInt(id);
    
    const deptRequests = requests.filter(r => r.department_id === deptId);
    
    const analytics = {
      total: deptRequests.length,
      pending: deptRequests.filter(r => r.status === 'pending').length,
      resolved: deptRequests.filter(r => r.status === 'resolved').length
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;