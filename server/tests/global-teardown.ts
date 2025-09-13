export default async function globalTeardown() {
  console.log('Cleaning up test environment...');
  
  // Any global cleanup can be done here
  // For now, we'll let individual tests handle their own cleanup
  
  console.log('Test environment cleanup complete');
}