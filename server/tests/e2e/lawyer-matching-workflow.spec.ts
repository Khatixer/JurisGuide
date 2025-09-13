import { test, expect, Page } from '@playwright/test';

test.describe('Lawyer Matching Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await setupTestUser(page);
  });

  test('should complete full lawyer matching and booking workflow', async () => {
    // Navigate to lawyer matching page
    await page.goto('/lawyer-matching');
    await expect(page.locator('h1')).toContainText('Find a Lawyer');

    // Fill search criteria
    await page.selectOption('[data-testid="case-type"]', 'family-law');
    await page.fill('[data-testid="location"]', 'San Francisco, CA');
    await page.fill('[data-testid="budget-min"]', '200');
    await page.fill('[data-testid="budget-max"]', '500');
    await page.selectOption('[data-testid="urgency"]', 'medium');
    await page.selectOption('[data-testid="language"]', 'en');

    // Submit search
    await page.click('[data-testid="search-lawyers"]');

    // Wait for search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-card"]')).toHaveCount.greaterThan(0);

    // Verify lawyer card information
    const firstLawyer = page.locator('[data-testid="lawyer-card"]').first();
    await expect(firstLawyer.locator('[data-testid="lawyer-name"]')).toBeVisible();
    await expect(firstLawyer.locator('[data-testid="lawyer-rating"]')).toBeVisible();
    await expect(firstLawyer.locator('[data-testid="lawyer-specializations"]')).toBeVisible();
    await expect(firstLawyer.locator('[data-testid="lawyer-hourly-rate"]')).toBeVisible();
    await expect(firstLawyer.locator('[data-testid="lawyer-distance"]')).toBeVisible();

    // View lawyer profile
    await firstLawyer.locator('[data-testid="view-profile"]').click();
    
    // Verify profile page
    await expect(page.locator('[data-testid="lawyer-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-bio"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-education"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-experience"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-reviews"]')).toBeVisible();

    // Book consultation
    await page.click('[data-testid="book-consultation"]');
    
    // Fill consultation form
    await expect(page.locator('[data-testid="consultation-form"]')).toBeVisible();
    await page.selectOption('[data-testid="consultation-type"]', 'initial-consultation');
    await page.fill('[data-testid="preferred-date"]', '2024-02-15');
    await page.fill('[data-testid="preferred-time"]', '14:00');
    await page.fill('[data-testid="case-summary"]', 'Need help with child custody arrangement');

    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Verify payment form
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="consultation-fee"]')).toBeVisible();
    
    // Fill payment information (test mode)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'Test User');

    // Complete booking
    await page.click('[data-testid="complete-booking"]');
    
    // Verify booking confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-invite"]')).toBeVisible();
  });

  test('should filter lawyers by multiple criteria', async () => {
    await page.goto('/lawyer-matching');

    // Apply multiple filters
    await page.selectOption('[data-testid="case-type"]', 'immigration');
    await page.fill('[data-testid="location"]', 'New York, NY');
    await page.fill('[data-testid="budget-max"]', '300');
    await page.selectOption('[data-testid="language"]', 'es');
    await page.check('[data-testid="verified-only"]');

    await page.click('[data-testid="search-lawyers"]');

    // Verify filtered results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Check that all results match criteria
    const lawyerCards = page.locator('[data-testid="lawyer-card"]');
    const count = await lawyerCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = lawyerCards.nth(i);
      
      // Verify specialization
      const specializations = await card.locator('[data-testid="lawyer-specializations"]').textContent();
      expect(specializations).toMatch(/immigration/i);
      
      // Verify hourly rate is within budget
      const rateText = await card.locator('[data-testid="lawyer-hourly-rate"]').textContent();
      const rate = parseInt(rateText?.match(/\$(\d+)/)?.[1] || '0');
      expect(rate).toBeLessThanOrEqual(300);
      
      // Verify verification status
      await expect(card.locator('[data-testid="verified-badge"]')).toBeVisible();
    }
  });

  test('should handle no results found', async () => {
    await page.goto('/lawyer-matching');

    // Search with very restrictive criteria
    await page.selectOption('[data-testid="case-type"]', 'maritime-law');
    await page.fill('[data-testid="location"]', 'Remote Location, XX');
    await page.fill('[data-testid="budget-max"]', '50');

    await page.click('[data-testid="search-lawyers"]');

    // Verify no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results"]')).toContainText('No lawyers found');
    
    // Verify suggestions are provided
    await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="broaden-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
  });

  test('should sort lawyers by different criteria', async () => {
    await page.goto('/lawyer-matching');
    
    // Perform initial search
    await page.selectOption('[data-testid="case-type"]', 'contract-law');
    await page.click('[data-testid="search-lawyers"]');
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Test sorting by rating
    await page.selectOption('[data-testid="sort-by"]', 'rating');
    await page.waitForTimeout(1000); // Wait for re-sort
    
    const ratingsSorted = await page.locator('[data-testid="lawyer-rating"]').allTextContents();
    const ratings = ratingsSorted.map(r => parseFloat(r.match(/(\d+\.\d+)/)?.[1] || '0'));
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a)); // Descending order

    // Test sorting by price
    await page.selectOption('[data-testid="sort-by"]', 'price');
    await page.waitForTimeout(1000);
    
    const pricesSorted = await page.locator('[data-testid="lawyer-hourly-rate"]').allTextContents();
    const prices = pricesSorted.map(p => parseInt(p.match(/\$(\d+)/)?.[1] || '0'));
    expect(prices).toEqual([...prices].sort((a, b) => a - b)); // Ascending order

    // Test sorting by distance
    await page.selectOption('[data-testid="sort-by"]', 'distance');
    await page.waitForTimeout(1000);
    
    const distancesSorted = await page.locator('[data-testid="lawyer-distance"]').allTextContents();
    const distances = distancesSorted.map(d => parseFloat(d.match(/(\d+\.\d+)/)?.[1] || '0'));
    expect(distances).toEqual([...distances].sort((a, b) => a - b)); // Ascending order
  });

  test('should handle consultation scheduling conflicts', async () => {
    await page.goto('/lawyer-matching');
    
    // Find and select a lawyer
    await page.selectOption('[data-testid="case-type"]', 'family-law');
    await page.click('[data-testid="search-lawyers"]');
    
    await page.locator('[data-testid="lawyer-card"]').first().locator('[data-testid="view-profile"]').click();
    await page.click('[data-testid="book-consultation"]');

    // Try to book an unavailable time slot
    await page.fill('[data-testid="preferred-date"]', '2024-01-01'); // Past date
    await page.fill('[data-testid="preferred-time"]', '09:00');
    
    await page.click('[data-testid="check-availability"]');
    
    // Verify conflict message
    await expect(page.locator('[data-testid="scheduling-conflict"]')).toBeVisible();
    await expect(page.locator('[data-testid="alternative-times"]')).toBeVisible();
    
    // Select alternative time
    await page.click('[data-testid="alternative-time"]').first();
    
    // Verify time is updated
    const selectedTime = await page.locator('[data-testid="selected-time"]').textContent();
    expect(selectedTime).toBeTruthy();
  });
});

test.describe('Lawyer Profile and Reviews', () => {
  test('should display comprehensive lawyer profile', async ({ page }) => {
    await setupTestUser(page);
    await page.goto('/lawyers/test-lawyer-id');

    // Verify profile sections
    await expect(page.locator('[data-testid="lawyer-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-photo"]')).toBeVisible();
    await expect(page.locator('[data-testid="lawyer-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="bar-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="years-experience"]')).toBeVisible();
    
    // Verify specializations
    await expect(page.locator('[data-testid="specializations"]')).toBeVisible();
    
    // Verify education
    await expect(page.locator('[data-testid="education-section"]')).toBeVisible();
    
    // Verify languages
    await expect(page.locator('[data-testid="languages"]')).toBeVisible();
    
    // Verify pricing information
    await expect(page.locator('[data-testid="pricing-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="hourly-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="consultation-fee"]')).toBeVisible();
  });

  test('should display and submit reviews', async ({ page }) => {
    await setupTestUser(page);
    await page.goto('/lawyers/test-lawyer-id');

    // Scroll to reviews section
    await page.locator('[data-testid="reviews-section"]').scrollIntoViewIfNeeded();
    
    // Verify existing reviews
    await expect(page.locator('[data-testid="reviews-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-reviews"]')).toBeVisible();
    
    // Check if user can leave a review (after consultation)
    const reviewButton = page.locator('[data-testid="write-review"]');
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      
      // Fill review form
      await page.click('[data-testid="rating-5"]'); // 5-star rating
      await page.fill('[data-testid="review-title"]', 'Excellent legal representation');
      await page.fill('[data-testid="review-content"]', 
        'Very professional and knowledgeable. Helped resolve my case efficiently.');
      
      // Submit review
      await page.click('[data-testid="submit-review"]');
      
      // Verify review submission
      await expect(page.locator('[data-testid="review-success"]')).toBeVisible();
    }
  });
});

async function setupTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}