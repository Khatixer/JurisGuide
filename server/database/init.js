const fs = require('fs-extra');
const path = require('path');

const dbDir = __dirname;
const usersFile = path.join(dbDir, 'users.json');
const departmentsFile = path.join(dbDir, 'departments.json');
const requestsFile = path.join(dbDir, 'requests.json');

function initDatabase() {
  // Ensure database directory exists
  fs.ensureDirSync(dbDir);

  // Initialize users file
  if (!fs.existsSync(usersFile)) {
    fs.writeJsonSync(usersFile, []);
  }

  // Initialize departments file
  if (!fs.existsSync(departmentsFile)) {
    const departments = [
      { id: 1, name: 'HR', description: 'Human Resources Department', contact_info: 'hr@company.com', created_at: new Date().toISOString() },
      { id: 2, name: 'IT', description: 'Information Technology Department', contact_info: 'it@company.com', created_at: new Date().toISOString() },
      { id: 3, name: 'Admin', description: 'Administration Department', contact_info: 'admin@company.com', created_at: new Date().toISOString() },
      { id: 4, name: 'Finance', description: 'Finance Department', contact_info: 'finance@company.com', created_at: new Date().toISOString() }
    ];
    fs.writeJsonSync(departmentsFile, departments);
  }

  // Initialize requests file
  if (!fs.existsSync(requestsFile)) {
    fs.writeJsonSync(requestsFile, []);
  }

  console.log('Database initialized successfully');
}

// Helper functions for database operations
function getUsers() {
  return fs.readJsonSync(usersFile);
}

function saveUsers(users) {
  fs.writeJsonSync(usersFile, users);
}

function getDepartments() {
  return fs.readJsonSync(departmentsFile);
}

function getRequests() {
  return fs.readJsonSync(requestsFile);
}

function saveRequests(requests) {
  fs.writeJsonSync(requestsFile, requests);
}

function getNextId(array) {
  return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
}

module.exports = {
  initDatabase,
  getUsers,
  saveUsers,
  getDepartments,
  getRequests,
  saveRequests,
  getNextId
};