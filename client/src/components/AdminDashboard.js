import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    contact_info: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/departments', newDepartment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Department added successfully!');
      setNewDepartment({ name: '', description: '', contact_info: '' });
      setShowAddForm(false);
      fetchDepartments();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add department');
    }
    
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setNewDepartment({
      ...newDepartment,
      [e.target.name]: e.target.value
    });
  };

  const handleEditDepartment = (dept) => {
    setEditingDept(dept);
    setNewDepartment({
      name: dept.name,
      description: dept.description,
      contact_info: dept.contact_info
    });
    setShowAddForm(false);
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/departments/${editingDept.id}`, newDepartment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Department updated successfully!');
      setNewDepartment({ name: '', description: '', contact_info: '' });
      setEditingDept(null);
      fetchDepartments();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update department');
    }
    
    setLoading(false);
  };

  const handleDeleteDepartment = async (deptId, deptName) => {
    if (!window.confirm(`Are you sure you want to delete the ${deptName} department? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/departments/${deptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Department deleted successfully!');
      fetchDepartments();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete department');
    }
  };

  const cancelEdit = () => {
    setEditingDept(null);
    setNewDepartment({ name: '', description: '', contact_info: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Department Management Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Department Management</h2>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  if (editingDept) cancelEdit();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {showAddForm ? 'Cancel' : 'Add Department'}
              </button>
            </div>

            {/* Add/Edit Department Form */}
            {(showAddForm || editingDept) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-4">
                  {editingDept ? 'Edit Department' : 'Add New Department'}
                </h3>
                <form onSubmit={editingDept ? handleUpdateDepartment : handleAddDepartment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={newDepartment.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Marketing, Sales, Operations"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      required
                      value={newDepartment.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of the department"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Information
                    </label>
                    <input
                      type="email"
                      name="contact_info"
                      required
                      value={newDepartment.contact_info}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="department@company.com"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? (editingDept ? 'Updating...' : 'Adding...') : (editingDept ? 'Update Department' : 'Add Department')}
                    </button>
                    <button
                      type="button"
                      onClick={editingDept ? cancelEdit : () => setShowAddForm(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Departments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div key={dept.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditDepartment(dept)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Edit Department"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        title="Delete Department"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{dept.description}</p>
                  <p className="text-blue-600 text-sm mb-2">{dept.contact_info}</p>
                  <div className="text-gray-400 text-xs">
                    <p>Created: {new Date(dept.created_at).toLocaleDateString()}</p>
                    {dept.updated_at && (
                      <p>Updated: {new Date(dept.updated_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {departments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No departments found. Add your first department!</p>
              </div>
            )}
          </div>
        </div>

        {/* Company Stats */}
        <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900">Total Departments</h3>
                <p className="text-3xl font-bold text-blue-600">{departments.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-900">Active Since</h3>
                <p className="text-lg font-semibold text-green-600">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-purple-900">System Status</h3>
                <p className="text-lg font-semibold text-purple-600">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;