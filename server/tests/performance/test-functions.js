const { v4: uuidv4 } = require('uuid');

const legalQueries = [
  "I have a contract dispute with my vendor over delayed delivery",
  "My landlord is trying to evict me without proper notice",
  "I was terminated from my job without cause and need to understand my rights",
  "My business partner wants to dissolve our partnership unfairly",
  "I need help with child custody arrangements after divorce",
  "My employer is not paying overtime compensation as required",
  "I have a dispute with my insurance company over claim denial",
  "My neighbor's construction is damaging my property",
  "I need help with immigration status and work authorization",
  "My former employer is preventing me from working with competitors"
];

const complexLegalQueries = [
  "I have a multi-jurisdictional contract dispute involving parties in California, New York, and the UK, with questions about governing law, jurisdiction, and enforcement of arbitration clauses",
  "My technology startup is facing intellectual property disputes, employment law issues with remote workers across multiple states, and regulatory compliance questions for our SaaS platform",
  "I'm involved in a complex family law matter involving international child custody, asset division across multiple countries, and prenuptial agreement enforcement",
  "My company is dealing with a data breach incident involving GDPR compliance, state privacy laws, potential class action lawsuits, and regulatory investigations",
  "I have a construction project dispute involving multiple contractors, subcontractors, suppliers, and insurance companies across different jurisdictions with complex liability issues"
];

const disputeSummaries = [
  "Payment dispute between contractor and client over project completion milestones",
  "Service delivery disagreement with different quality expectations",
  "Partnership dissolution with asset distribution conflicts",
  "Employment termination dispute with severance package disagreement",
  "Intellectual property licensing conflict over usage rights",
  "Real estate transaction dispute over property condition disclosure",
  "Insurance claim denial dispute over coverage interpretation",
  "Vendor contract breach with delivery timeline violations"
];

function generateLegalQuery(context, events, done) {
  const query = legalQueries[Math.floor(Math.random() * legalQueries.length)];
  context.vars.generatedQuery = query;
  return done();
}

function generateComplexLegalQuery(context, events, done) {
  const query = complexLegalQueries[Math.floor(Math.random() * complexLegalQueries.length)];
  context.vars.generatedQuery = query;
  return done();
}

function generateDisputeSummary(context, events, done) {
  const summary = disputeSummaries[Math.floor(Math.random() * disputeSummaries.length)];
  context.vars.generatedSummary = summary;
  return done();
}

function generateUserId(context, events, done) {
  context.vars.generatedUserId = uuidv4();
  return done();
}

function generateLawyerId(context, events, done) {
  // Generate a realistic lawyer ID for testing
  const lawyerIds = [
    '660e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003'
  ];
  context.vars.generatedLawyerId = lawyerIds[Math.floor(Math.random() * lawyerIds.length)];
  return done();
}

// Custom metrics tracking
function trackResponseTime(context, events, done) {
  const startTime = Date.now();
  context.vars.requestStartTime = startTime;
  return done();
}

function recordResponseTime(context, events, done) {
  if (context.vars.requestStartTime) {
    const responseTime = Date.now() - context.vars.requestStartTime;
    events.emit('counter', 'custom.response_time', responseTime);
  }
  return done();
}

// Error handling
function handleError(context, events, done) {
  if (context.response && context.response.statusCode >= 400) {
    events.emit('counter', `custom.error_${context.response.statusCode}`, 1);
  }
  return done();
}

module.exports = {
  generateLegalQuery,
  generateComplexLegalQuery,
  generateDisputeSummary,
  generateUserId,
  generateLawyerId,
  trackResponseTime,
  recordResponseTime,
  handleError
};