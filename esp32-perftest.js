import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 30 },  // Ramp up to 30 users
    { duration: '1m', target: 30 },   // Stay at 30 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be less than 10%
    errors: ['rate<0.1'],             // Custom error rate should be less than 10%
  },
};

// Get ESP32 URL from environment variable or use default
const ESP32_URL = __ENV.ESP32_URL || 'http://192.168.1.100';

export default function () {
  // Test the root endpoint
  const rootResponse = http.get(ESP32_URL);
  
  // Check if request was successful
  const rootCheck = check(rootResponse, {
    'root status is 200': (r) => r.status === 200,
    'root response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!rootCheck);

  // Test a specific endpoint if available (adjust based on your ESP32 server)
  const apiResponse = http.get(`${ESP32_URL}/api/status`);
  
  const apiCheck = check(apiResponse, {
    'api status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'api response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!apiCheck);

  // Simulate user think time
  sleep(1);
}

// Setup function runs once per VU before the default function
export function setup() {
  console.log(`Starting performance test against ESP32 at ${ESP32_URL}`);
  
  // Verify ESP32 is reachable
  const response = http.get(ESP32_URL, { timeout: '10s' });
  console.log(`Initial connectivity check: Status ${response.status}`);
  
  return { startTime: new Date().toISOString() };
}

// Teardown function runs once per VU after the default function
export function teardown(data) {
  console.log(`Test completed. Started at ${data.startTime}`);
}
