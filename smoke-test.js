import http from 'k6/http';
import { check, sleep } from 'k6';

// Simple smoke test - quick validation with minimal load
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.1'],     // Error rate should be less than 10%
  },
};

// Get ESP32 URL from environment variable or use default
const ESP32_URL = __ENV.ESP32_URL || 'http://192.168.1.100';

export default function () {
  const response = http.get(ESP32_URL);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  console.log(`Response time: ${response.timings.duration.toFixed(2)}ms, Status: ${response.status}`);

  sleep(1);
}

export function setup() {
  console.log(`Running smoke test against ESP32 at ${ESP32_URL}`);
  console.log('This is a simple connectivity and performance check.');
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`Smoke test completed. Started at ${data.startTime}`);
}
