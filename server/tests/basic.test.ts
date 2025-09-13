describe('Basic Test Setup', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});