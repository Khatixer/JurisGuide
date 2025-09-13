import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ClientDashboard() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    departmentId: '',
    attachment: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchDepartments();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/api/requests/my-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('title', newRequest.title);
    formData.append('description', newRequest.description);
    formData.append('departmentId', newRequest.departmentId);
    if (newRequest.attachment) {
      formData.append('attachment', newRequest.attachment);
    }

    try {
      await axios.post('/api/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setNewRequest({ title: '', description: '', departmentId: '', attachment: null });
      fetchRequests();
      setActiveTab('requests');
    } catch (error) {
      console.error('Failed to submit request:', error);
    }
    
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              New Request
            </button>
          </nav>
        </div>

        {activeTab === 'requests' && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Requests</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <li key={request.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{request.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{request.description}</p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>Department: {request.department_name}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {request.response_message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Response:</strong> {request.response_message}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'new' && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Submit New Request</h2>
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <form onSubmit={handleSubmitRequest} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={newRequest.departmentId}
                      onChange={(e) => setNewRequest({...newRequest, departmentId: e.target.value})}
                    >
                      <option value="">Select a department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      required
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attachment (optional)</label>
                    <input
                      type="file"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => setNewRequest({...newRequest, attachment: e.target.files[0]})}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientDashboard;