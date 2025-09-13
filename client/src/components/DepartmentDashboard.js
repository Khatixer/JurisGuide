import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function DepartmentDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (user?.departmentId) {
      fetchRequests();
      fetchAnalytics();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`/api/requests/department/${user.departmentId}`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`/api/departments/${user.departmentId}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await axios.patch(`/api/requests/${requestId}/status`, {
        status,
        responseMessage: responseMessage || null
      });
      
      fetchRequests();
      fetchAnalytics();
      setSelectedRequest(null);
      setResponseMessage('');
    } catch (error) {
      console.error('Failed to update request:', error);
    }
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
        {/* Analytics Dashboard */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Department Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">T</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.total || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">P</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.pending || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">R</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.resolved || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Requests</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage incoming requests for your department
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">{request.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{request.description}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>From: {request.client_name} ({request.client_email})</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    {request.attachment_path && (
                      <div className="mt-2">
                        <a 
                          href={`/uploads/${request.attachment_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                          📎 View Attachment
                        </a>
                      </div>
                    )}
                  </div>
                  {request.status === 'pending' && (
                    <div className="ml-4">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Respond
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Response Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Respond to: {selectedRequest.title}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Message (optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Add a response message..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'resolved')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Reject
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setResponseMessage('');
                  }}
                  className="w-full mt-3 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DepartmentDashboard;