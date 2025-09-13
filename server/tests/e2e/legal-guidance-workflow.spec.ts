import { test, expect, Page } from '@playwright/test';

test.describe('Legal Guidance Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Setup test user and login
    await setupTestUser(page);
  });

  test('should complete full legal guidance workflow', async () => {
    // Navigate to legal guidance page
    await page.goto('/legal-guidance');
    await expect(page.locator('h1')).toContainText('Legal Guidance');

    // Fill out legal query form
    await page.fill('[data-testid="query-description"]', 
      'I have a contract dispute with my landlord about security deposit return');
    
    await page.selectOption('[data-testid="query-category"]', 'housing-law');
    await page.selectOption('[data-testid="query-jurisdiction"]', 'US-CA');
    await page.selectOption('[data-testid="query-urgency"]', 'medium');
    await page.fill('[data-testid="cultural-context"]', 'Western tenant rights');

    // Submit query
    await page.click('[data-testid="submit-query"]');

    // Wait for AI processing
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeHidden({ timeout: 30000 });

    // Verify guidance is displayed
    await expect(page.locator('[data-testid="guidance-steps"]')).toBeVisible();
    await expect(page.locator('[data-testid="guidance-step"]')).toHaveCount.greaterThan(0);

    // Check step-by-step guidance
    const firstStep = page.locator('[data-testid="guidance-step"]').first();
    await expect(firstStep.locator('[data-testid="step-title"]')).toBeVisible();
    await expect(firstStep.locator('[data-testid="step-description"]')).toBeVisible();
    await expect(firstStep.locator('[data-testid="step-timeframe"]')).toBeVisible();

    // Verify applicable laws section
    await expect(page.locator('[data-testid="applicable-laws"]')).toBeVisible();
    
    // Verify cultural considerations
    await expect(page.locator('[data-testid="cultural-considerations"]')).toBeVisible();

    // Verify next actions
    await expect(page.locator('[data-testid="next-actions"]')).toBeVisible();

    // Test legal term tooltips
    const legalTerm = page.locator('[data-testid="legal-term"]').first();
    if (await legalTerm.count() > 0) {
      await legalTerm.hover();
      await expect(page.locator('[data-testid="legal-term-tooltip"]')).toBeVisible();
    }

    // Test guidance export functionality
    await page.click('[data-testid="export-guidance"]');
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/legal-guidance.*\.pdf/);
  });

  test('should handle multilingual guidance', async () => {
    // Change language to Spanish
    await page.goto('/settings');
    await page.selectOption('[data-testid="language-selector"]', 'es');
    await page.click('[data-testid="save-preferences"]');

    // Navigate to legal guidance
    await page.goto('/legal-guidance');
    
    // Verify interface is in Spanish
    await expect(page.locator('h1')).toContainText('Orientación Legal');

    // Submit query in Spanish
    await page.fill('[data-testid="query-description"]', 
      'Tengo una disputa contractual con mi arrendador sobre el depósito de seguridad');
    
    await page.selectOption('[data-testid="query-category"]', 'housing-law');
    await page.click('[data-testid="submit-query"]');

    // Wait for processing
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeHidden({ timeout: 30000 });

    // Verify guidance is in Spanish
    const guidanceText = await page.locator('[data-testid="guidance-steps"]').textContent();
    expect(guidanceText).toMatch(/debe|puede|tiene|derecho/i); // Spanish legal terms
  });

  test('should handle jurisdiction-specific guidance', async () => {
    await page.goto('/legal-guidance');

    // Test US-CA jurisdiction
    await page.fill('[data-testid="query-description"]', 'Employment termination without cause');
    await page.selectOption('[data-testid="query-category"]', 'employment-law');
    await page.selectOption('[data-testid="query-jurisdiction"]', 'US-CA');
    await page.click('[data-testid="submit-query"]');

    await expect(page.locator('[data-testid="processing-indicator"]')).toBeHidden({ timeout: 30000 });

    // Verify California-specific laws are mentioned
    const lawsText = await page.locator('[data-testid="applicable-laws"]').textContent();
    expect(lawsText).toMatch(/California|CA|Labor Code/i);

    // Test different jurisdiction
    await page.click('[data-testid="new-query"]');
    await page.fill('[data-testid="query-description"]', 'Employment termination without cause');
    await page.selectOption('[data-testid="query-category"]', 'employment-law');
    await page.selectOption('[data-testid="query-jurisdiction"]', 'US-NY');
    await page.click('[data-testid="submit-query"]');

    await expect(page.locator('[data-testid="processing-indicator"]')).toBeHidden({ timeout: 30000 });

    // Verify New York-specific laws are mentioned
    const nyLawsText = await page.locator('[data-testid="applicable-laws"]').textContent();
    expect(nyLawsText).toMatch(/New York|NY|Labor Law/i);
  });

  test('should handle urgent queries with priority processing', async () => {
    await page.goto('/legal-guidance');

    await page.fill('[data-testid="query-description"]', 
      'I received an eviction notice and need immediate help');
    await page.selectOption('[data-testid="query-category"]', 'housing-law');
    await page.selectOption('[data-testid="query-urgency"]', 'critical');
    await page.click('[data-testid="submit-query"]');

    // Verify urgent processing indicator
    await expect(page.locator('[data-testid="urgent-processing"]')).toBeVisible();
    
    // Should process faster for urgent queries
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeHidden({ timeout: 15000 });

    // Verify urgent guidance includes immediate actions
    const immediateActions = page.locator('[data-testid="immediate-actions"]');
    await expect(immediateActions).toBeVisible();
    
    const actionsText = await immediateActions.textContent();
    expect(actionsText).toMatch(/immediate|urgent|today|now/i);
  });
});

test.describe('Legal Guidance Error Handling', () => {
  test('should handle AI service unavailable', async ({ page }) => {
    await setupTestUser(page);
    
    // Mock AI service failure
    await page.route('**/api/legal-guidance/generate', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'AI service temporarily unavailable' })
      });
    });

    await page.goto('/legal-guidance');
    await page.fill('[data-testid="query-description"]', 'Test query');
    await page.selectOption('[data-testid="query-category"]', 'contract-law');
    await page.click('[data-testid="submit-query"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('temporarily unavailable');
    
    // Verify fallback options are provided
    await expect(page.locator('[data-testid="fallback-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-lawyer"]')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await setupTestUser(page);
    await page.goto('/legal-guidance');

    // Try to submit empty form
    await page.click('[data-testid="submit-query"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="description-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-error"]')).toBeVisible();

    // Fill minimum required fields
    await page.fill('[data-testid="query-description"]', 'A');
    await expect(page.locator('[data-testid="description-error"]')).toContainText('minimum 10 characters');

    // Fill valid description
    await page.fill('[data-testid="query-description"]', 'Valid legal query description');
    await expect(page.locator('[data-testid="description-error"]')).toBeHidden();
  });
});

async function setupTestUser(page: Page) {
  // Navigate to login page
  await page.goto('/login');
  
  // Login with test user
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}