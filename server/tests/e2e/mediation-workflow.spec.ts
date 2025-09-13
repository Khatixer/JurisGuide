import { test, expect, Page } from '@playwright/test';

test.describe('AI-Powered Mediation Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await setupTestUser(page);
  });

  test('should create and manage mediation case', async () => {
    // Navigate to mediation page
    await page.goto('/mediation');
    await expect(page.locator('h1')).toContainText('Mediation Services');

    // Create new mediation case
    await page.click('[data-testid="create-mediation"]');
    
    // Fill mediation case form
    await expect(page.locator('[data-testid="mediation-form"]')).toBeVisible();
    
    // Add parties
    await page.fill('[data-testid="respondent-email"]', 'respondent@example.com');
    await page.click('[data-testid="add-party"]');
    
    // Fill dispute details
    await page.fill('[data-testid="dispute-summary"]', 
      'Contract payment dispute over web development services. Client claims work was incomplete, contractor claims full payment is due.');
    
    await page.selectOption('[data-testid="dispute-category"]', 'contract-law');
    await page.selectOption('[data-testid="jurisdiction"]', 'US-CA');
    
    // Add cultural factors
    await page.check('[data-testid="cultural-factor-business-practices"]');
    await page.check('[data-testid="cultural-factor-communication-styles"]');
    
    // Submit case creation
    await page.click('[data-testid="create-case"]');
    
    // Verify case creation
    await expect(page.locator('[data-testid="case-created"]')).toBeVisible();
    await expect(page.locator('[data-testid="case-id"]')).toBeVisible();
    
    // Verify AI-generated dispute summary
    await expect(page.locator('[data-testid="ai-dispute-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="neutral-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="key-issues"]')).toBeVisible();
    await expect(page.locator('[data-testid="recommended-actions"]')).toBeVisible();
  });

  test('should facilitate multi-party communication', async () => {
    // Navigate to existing mediation case
    await page.goto('/mediation/case/test-case-id');
    
    // Verify case dashboard
    await expect(page.locator('[data-testid="mediation-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="case-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="parties-list"]')).toBeVisible();
    
    // Send message in mediation
    await page.fill('[data-testid="message-input"]', 
      'I believe we can resolve this by reviewing the original project scope and timeline.');
    
    await page.click('[data-testid="send-message"]');
    
    // Verify message appears in chat
    await expect(page.locator('[data-testid="message-thread"]')).toContainText('original project scope');
    
    // Verify AI moderation (if message needed moderation)
    const moderatedMessage = page.locator('[data-testid="moderated-message"]');
    if (await moderatedMessage.isVisible()) {
      await expect(moderatedMessage).toContainText('respectful communication');
    }
    
    // Test file sharing
    await page.click('[data-testid="attach-file"]');
    
    // Upload document
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });
    
    await page.fill('[data-testid="file-description"]', 'Original contract document');
    await page.click('[data-testid="upload-file"]');
    
    // Verify file upload
    await expect(page.locator('[data-testid="uploaded-files"]')).toContainText('contract.pdf');
  });

  test('should generate AI mediation recommendations', async () => {
    await page.goto('/mediation/case/test-case-id');
    
    // Request AI recommendations
    await page.click('[data-testid="get-ai-recommendations"]');
    
    // Wait for AI processing
    await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-processing"]')).toBeHidden({ timeout: 30000 });
    
    // Verify recommendations are displayed
    await expect(page.locator('[data-testid="ai-recommendations"]')).toBeVisible();
    
    // Check recommendation categories
    await expect(page.locator('[data-testid="process-recommendations"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolution-recommendations"]')).toBeVisible();
    await expect(page.locator('[data-testid="cultural-bridging"]')).toBeVisible();
    
    // Verify next steps
    await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    
    // Test accepting a recommendation
    await page.click('[data-testid="accept-recommendation"]').first();
    
    // Verify recommendation is implemented
    await expect(page.locator('[data-testid="recommendation-accepted"]')).toBeVisible();
  });

  test('should handle cross-cultural mediation', async () => {
    await page.goto('/mediation');
    
    // Create case with cross-cultural elements
    await page.click('[data-testid="create-mediation"]');
    
    // Set up parties with different cultural backgrounds
    await page.fill('[data-testid="respondent-email"]', 'respondent@example.com');
    await page.selectOption('[data-testid="respondent-culture"]', 'Asian');
    await page.selectOption('[data-testid="complainant-culture"]', 'Western');
    
    await page.fill('[data-testid="dispute-summary"]', 
      'Business partnership dispute with different expectations about decision-making processes');
    
    await page.selectOption('[data-testid="dispute-category"]', 'business-law');
    
    // Add cultural factors
    await page.check('[data-testid="cultural-factor-hierarchy-respect"]');
    await page.check('[data-testid="cultural-factor-indirect-communication"]');
    await page.check('[data-testid="cultural-factor-consensus-building"]');
    
    await page.click('[data-testid="create-case"]');
    
    // Verify cultural considerations are included
    await expect(page.locator('[data-testid="cultural-considerations"]')).toBeVisible();
    await expect(page.locator('[data-testid="cultural-considerations"]')).toContainText('hierarchy');
    await expect(page.locator('[data-testid="cultural-considerations"]')).toContainText('communication styles');
    
    // Verify culturally adapted communication suggestions
    await expect(page.locator('[data-testid="communication-guidelines"]')).toBeVisible();
  });

  test('should track mediation progress and generate reports', async () => {
    await page.goto('/mediation/case/test-case-id');
    
    // View mediation timeline
    await page.click('[data-testid="view-timeline"]');
    
    await expect(page.locator('[data-testid="mediation-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-event"]')).toHaveCount.greaterThan(0);
    
    // Check timeline events
    const events = page.locator('[data-testid="timeline-event"]');
    const firstEvent = events.first();
    
    await expect(firstEvent.locator('[data-testid="event-timestamp"]')).toBeVisible();
    await expect(firstEvent.locator('[data-testid="event-type"]')).toBeVisible();
    await expect(firstEvent.locator('[data-testid="event-description"]')).toBeVisible();
    
    // Generate mediation report
    await page.click('[data-testid="generate-report"]');
    
    // Verify report generation
    await expect(page.locator('[data-testid="report-generation"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-generation"]')).toBeHidden({ timeout: 15000 });
    
    // Verify report content
    await expect(page.locator('[data-testid="mediation-report"]')).toBeVisible();
    await expect(page.locator('[data-testid="case-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="key-agreements"]')).toBeVisible();
    await expect(page.locator('[data-testid="outstanding-issues"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    
    // Download report
    await page.click('[data-testid="download-report"]');
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/mediation-report.*\.pdf/);
  });

  test('should handle mediation case closure', async () => {
    await page.goto('/mediation/case/test-case-id');
    
    // Simulate successful mediation
    await page.fill('[data-testid="message-input"]', 
      'We have reached an agreement on all disputed points.');
    await page.click('[data-testid="send-message"]');
    
    // Propose case closure
    await page.click('[data-testid="propose-closure"]');
    
    // Fill closure form
    await expect(page.locator('[data-testid="closure-form"]')).toBeVisible();
    
    await page.selectOption('[data-testid="closure-reason"]', 'agreement-reached');
    await page.fill('[data-testid="agreement-summary"]', 
      'Both parties agreed to revised payment schedule and project completion timeline.');
    
    await page.check('[data-testid="all-parties-consent"]');
    
    // Submit closure
    await page.click('[data-testid="close-case"]');
    
    // Verify case closure
    await expect(page.locator('[data-testid="case-closed"]')).toBeVisible();
    await expect(page.locator('[data-testid="closure-confirmation"]')).toBeVisible();
    
    // Verify final report generation
    await expect(page.locator('[data-testid="final-report"]')).toBeVisible();
    
    // Check case status update
    await expect(page.locator('[data-testid="case-status"]')).toContainText('Closed');
  });
});

test.describe('Mediation Error Handling', () => {
  test('should handle AI service failures gracefully', async ({ page }) => {
    await setupTestUser(page);
    
    // Mock AI service failure
    await page.route('**/api/mediation/ai-recommendations', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'AI mediation service unavailable' })
      });
    });
    
    await page.goto('/mediation/case/test-case-id');
    await page.click('[data-testid="get-ai-recommendations"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="ai-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-error"]')).toContainText('temporarily unavailable');
    
    // Verify fallback options
    await expect(page.locator('[data-testid="manual-mediation-tools"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-human-mediator"]')).toBeVisible();
  });

  test('should validate mediation case creation', async ({ page }) => {
    await setupTestUser(page);
    await page.goto('/mediation');
    
    await page.click('[data-testid="create-mediation"]');
    
    // Try to submit empty form
    await page.click('[data-testid="create-case"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="respondent-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="dispute-summary-error"]')).toBeVisible();
    
    // Fill minimum required fields
    await page.fill('[data-testid="dispute-summary"]', 'Short');
    await expect(page.locator('[data-testid="dispute-summary-error"]')).toContainText('minimum 50 characters');
  });
});

async function setupTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}