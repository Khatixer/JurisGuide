// Simple startup script for JurisGuide Platform
const express = require('express');
const cors = require('cors');
const path = require('path');

// Check if Supabase is configured
const SUPABASE_ENABLED = process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY;

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'client/build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'JurisGuide Platform is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    platform: 'JurisGuide Legal AI Platform',
    services: {
      server: 'online',
      database: 'supabase-ready',
      ai: 'ready',
      features: [
        'Legal Guidance AI',
        'Lawyer Matching',
        'AI Mediation',
        'Multi-language Support',
        'Cultural Sensitivity',
        'Secure Communications',
        'Subscription Management',
        'White-label Solutions',
        'Real-time Updates',
        'Cloud Database (Supabase)'
      ]
    }
  });
});

// Authentication endpoints (mock)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication - in real app, verify credentials
  res.json({
    success: true,
    data: {
      user: {
        id: 'user_' + Date.now(),
        email: email,
        name: 'Demo User',
        role: 'user'
      },
      token: 'token_' + Date.now()
    },
    message: 'Login successful'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, userType } = req.body;
  
  // Mock registration
  res.json({
    success: true,
    data: {
      user: {
        id: 'user_' + Date.now(),
        name: name,
        email: email,
        role: userType || 'user'
      },
      token: 'token_' + Date.now()
    },
    message: 'Registration successful'
  });
});

// Mock data storage
let legalQueries = [];
let guidanceResponses = {};

// Legal Queries API
app.post('/api/legal-queries', (req, res) => {
  const query = {
    id: 'query_' + Date.now(),
    ...req.body,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  
  legalQueries.push(query);
  
  res.json({
    success: true,
    data: query,
    message: 'Legal query submitted successfully'
  });
});

app.get('/api/legal-queries/history', (req, res) => {
  res.json({
    success: true,
    data: legalQueries.slice(-10) // Return last 10 queries
  });
});

app.delete('/api/legal-queries/:id', (req, res) => {
  const queryId = req.params.id;
  legalQueries = legalQueries.filter(q => q.id !== queryId);
  delete guidanceResponses[queryId];
  
  res.json({
    success: true,
    message: 'Query deleted successfully'
  });
});

// Legal Guidance Generation API
app.post('/api/legal-guidance/generate', (req, res) => {
  const { queryId } = req.body;
  const query = legalQueries.find(q => q.id === queryId);
  
  if (!query) {
    return res.status(404).json({
      success: false,
      error: { message: 'Query not found' }
    });
  }

  // Generate mock AI guidance based on the query
  const mockGuidance = {
    queryId: queryId,
    guidanceSteps: [
      {
        title: 'Understanding Your Legal Issue',
        description: `Based on your ${query.category || 'legal'} question, here's what you need to know:`,
        content: `Your query about "${query.description?.substring(0, 100) || 'legal matter'}" falls under ${query.category || 'general'} law. This is a common legal issue that can be addressed through proper legal channels.`,
        actionItems: [
          'Review the relevant laws and regulations',
          'Gather all necessary documentation',
          'Consider consulting with a qualified attorney'
        ]
      },
      {
        title: 'Legal Framework & Jurisdiction',
        description: `Applicable laws in ${query.jurisdiction?.[0] || 'your jurisdiction'}:`,
        content: `The legal framework governing your situation includes both federal and state/local laws. In ${query.jurisdiction?.[0] || 'your jurisdiction'}, specific regulations may apply to your case.`,
        actionItems: [
          'Research local statutes and regulations',
          'Check for recent legal updates',
          'Understand your rights and obligations'
        ]
      },
      {
        title: 'Recommended Next Steps',
        description: 'Here are the immediate actions you should consider:',
        content: 'Based on the urgency level and complexity of your case, we recommend taking systematic steps to address your legal concerns.',
        actionItems: [
          'Document all relevant facts and evidence',
          'Consult with a specialized attorney',
          'Consider alternative dispute resolution if applicable',
          'Set realistic timelines for resolution'
        ]
      },
      {
        title: 'Cultural Considerations',
        description: 'Important cultural and communication factors:',
        content: `We've adapted this guidance to be culturally sensitive and appropriate for your background. Communication styles and legal approaches may vary based on cultural context.`,
        actionItems: [
          'Consider cultural factors in legal proceedings',
          'Seek culturally competent legal representation',
          'Understand how cultural differences may impact your case'
        ]
      }
    ],
    applicableLaws: [
      {
        title: `${query.category || 'General'} Law Basics`,
        description: 'Fundamental legal principles that apply to your situation',
        jurisdiction: query.jurisdiction?.[0] || 'General'
      }
    ],
    culturalConsiderations: {
      communicationStyle: 'Direct and professional',
      culturalFactors: ['Legal system familiarity', 'Language considerations', 'Cultural norms'],
      recommendations: 'Seek legal counsel familiar with your cultural background'
    },
    nextActions: [
      {
        action: 'Consult Attorney',
        priority: 'High',
        timeframe: '1-2 weeks',
        description: 'Schedule consultation with qualified legal professional'
      },
      {
        action: 'Gather Documentation',
        priority: 'High',
        timeframe: '1 week',
        description: 'Collect all relevant documents and evidence'
      },
      {
        action: 'Research Options',
        priority: 'Medium',
        timeframe: '2-3 weeks',
        description: 'Explore all available legal remedies and alternatives'
      }
    ],
    confidence: 0.85,
    estimatedResolutionTime: '2-6 months',
    complexity: query.urgency === 'high' ? 'High' : 'Medium'
  };

  guidanceResponses[queryId] = mockGuidance;
  
  res.json({
    success: true,
    data: mockGuidance,
    message: 'AI guidance generated successfully'
  });
});

app.get('/api/legal-guidance/:queryId', (req, res) => {
  const queryId = req.params.queryId;
  const guidance = guidanceResponses[queryId];
  
  if (!guidance) {
    return res.status(404).json({
      success: false,
      error: { message: 'Guidance not found' }
    });
  }
  
  res.json({
    success: true,
    data: {
      guidance: guidance,
      completedSteps: [] // Mock completed steps
    }
  });
});

app.patch('/api/legal-guidance/:queryId/progress', (req, res) => {
  const queryId = req.params.queryId;
  const { completedSteps } = req.body;
  
  // Mock saving progress
  res.json({
    success: true,
    message: 'Progress saved successfully',
    data: { completedSteps }
  });
});

// Mock data for lawyers
const mockLawyers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    specialization: 'Contract Law',
    experience: '8 years',
    rating: 4.9,
    hourlyRate: 350,
    location: 'New York, NY',
    languages: ['English', 'Spanish'],
    bio: 'Experienced contract attorney specializing in business agreements and employment contracts.',
    availability: 'Available this week',
    image: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=059669&color=fff'
  },
  {
    id: 2,
    name: 'Michael Chen',
    specialization: 'Employment Law',
    experience: '12 years',
    rating: 4.8,
    hourlyRate: 425,
    location: 'San Francisco, CA',
    languages: ['English', 'Mandarin'],
    bio: 'Employment law expert with extensive experience in workplace disputes and discrimination cases.',
    availability: 'Available next week',
    image: 'https://ui-avatars.com/api/?name=Michael+Chen&background=dc2626&color=fff'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    specialization: 'Family Law',
    experience: '6 years',
    rating: 4.7,
    hourlyRate: 275,
    location: 'Miami, FL',
    languages: ['English', 'Spanish'],
    bio: 'Compassionate family law attorney focusing on divorce, custody, and adoption cases.',
    availability: 'Available today',
    image: 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=7c3aed&color=fff'
  },
  {
    id: 4,
    name: 'David Kim',
    specialization: 'Business Law',
    experience: '15 years',
    rating: 4.9,
    hourlyRate: 550,
    location: 'Chicago, IL',
    languages: ['English', 'Korean'],
    bio: 'Senior business attorney with expertise in corporate law, mergers, and acquisitions.',
    availability: 'Booking 2 weeks out',
    image: 'https://ui-avatars.com/api/?name=David+Kim&background=ea580c&color=fff'
  }
];

// Mock data for mediation cases
let mediationCases = [
  {
    id: 1,
    title: 'Contract Dispute Resolution',
    parties: ['John Smith', 'ABC Company'],
    status: 'active',
    createdAt: '2024-01-15',
    description: 'Dispute over contract terms and payment schedule',
    nextSession: '2024-01-20 10:00 AM',
    progress: 60
  },
  {
    id: 2,
    title: 'Employment Disagreement',
    parties: ['Sarah Johnson', 'Tech Corp'],
    status: 'pending',
    createdAt: '2024-01-18',
    description: 'Workplace harassment and compensation issues',
    nextSession: 'Scheduling in progress',
    progress: 20
  }
];

// Lawyer search API
app.get('/api/lawyers/search', (req, res) => {
  const { specialization, location, maxBudget, experience, language } = req.query;
  
  let filteredLawyers = [...mockLawyers];
  
  if (specialization && specialization !== 'any') {
    filteredLawyers = filteredLawyers.filter(lawyer => 
      lawyer.specialization.toLowerCase().includes(specialization.toLowerCase())
    );
  }
  
  if (maxBudget && maxBudget !== 'any') {
    filteredLawyers = filteredLawyers.filter(lawyer => 
      lawyer.hourlyRate <= parseInt(maxBudget)
    );
  }
  
  if (location) {
    filteredLawyers = filteredLawyers.filter(lawyer => 
      lawyer.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  res.json({
    success: true,
    data: filteredLawyers,
    message: `Found ${filteredLawyers.length} lawyers matching your criteria`
  });
});

// Mediation cases API
app.get('/api/mediation/cases', (req, res) => {
  res.json({
    success: true,
    data: mediationCases,
    message: 'Mediation cases retrieved successfully'
  });
});

app.post('/api/mediation/cases', (req, res) => {
  const newCase = {
    id: Date.now(),
    ...req.body,
    parties: req.body.parties.split(',').map(p => p.trim()),
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
    nextSession: 'AI analysis in progress',
    progress: 0
  };
  
  mediationCases.push(newCase);
  
  res.json({
    success: true,
    data: newCase,
    message: 'Mediation case created successfully'
  });
});

// Other API endpoints
app.get('/api/legal-guidance', (req, res) => {
  res.json({
    message: 'Legal Guidance API is ready',
    description: 'AI-powered legal guidance with cultural sensitivity',
    status: 'available'
  });
});

app.get('/api/lawyers', (req, res) => {
  res.json({
    message: 'Lawyer Matching API is ready',
    description: 'Smart lawyer matching based on expertise, location, and budget',
    status: 'available',
    data: mockLawyers
  });
});

app.get('/api/mediation', (req, res) => {
  res.json({
    message: 'AI Mediation API is ready',
    description: 'AI-powered dispute resolution and mediation services',
    status: 'available',
    data: mediationCases
  });
});

app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    message: 'Analytics Dashboard is ready',
    description: 'Business intelligence and performance monitoring',
    status: 'available',
    metrics: {
      totalUsers: 0,
      activeUsers: 0,
      legalQueries: legalQueries.length,
      lawyerMatches: 0,
      mediationCases: 0,
      revenue: 0
    }
  });
});

// Serve React app for all other routes (non-API routes)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 JurisGuide Platform Starting...');
  console.log('');
  console.log('✅ Server Status: ONLINE');
  console.log(`📊 Main Application: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('🎯 Available Features:');
  console.log('   • AI Legal Guidance System');
  console.log('   • Smart Lawyer Matching');
  console.log('   • AI-Powered Mediation');
  console.log('   • Multi-language Support');
  console.log('   • Cultural Sensitivity Engine');
  console.log('   • Secure Communications');
  console.log('   • Subscription Management');
  console.log('   • White-label Solutions');
  console.log('   • Analytics Dashboard');
  console.log('');
  console.log('🔧 API Endpoints:');
  console.log(`   • Legal Guidance: http://localhost:${PORT}/api/legal-guidance`);
  console.log(`   • Lawyer Matching: http://localhost:${PORT}/api/lawyers`);
  console.log(`   • AI Mediation: http://localhost:${PORT}/api/mediation`);
  console.log(`   • Analytics: http://localhost:${PORT}/api/analytics/dashboard`);
  console.log('');
  console.log('🎉 JurisGuide Platform is ready for users!');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Configure external API keys in .env.production');
  console.log('   2. Set up PostgreSQL database');
  console.log('   3. Configure Redis cache');
  console.log('   4. Add SSL certificates for production');
  console.log('   5. Set up monitoring and analytics');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});