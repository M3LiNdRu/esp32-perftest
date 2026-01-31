# ESP32 Performance Testing with k6 and Grafana

This project provides a complete performance testing solution for web servers running on ESP32 microcontrollers using k6, InfluxDB, and Grafana.

## Features

- **k6 Load Testing**: Progressive load testing with configurable stages
- **Real-time Metrics**: Live visualization of performance metrics
- **Grafana Dashboard**: Pre-configured dashboard showing:
  - Requests per second (RPS)
  - Response times (average, min, max)
  - Response time percentiles (p50, p90, p99)
  - Error rates
  - Virtual users count
- **InfluxDB Storage**: Time-series database for metrics storage
- **Docker Compose**: Easy setup with all components containerized

## Prerequisites

- Docker and Docker Compose installed
- ESP32 with a web server running and accessible from your network
- The ESP32's IP address or hostname

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/M3LiNdRu/esp32-perftest.git
cd esp32-perftest
```

### 2. Configure ESP32 URL

Copy the example environment file and update the ESP32 URL:

```bash
cp .env.example .env
```

Edit `.env` and set your ESP32's IP address:

```env
ESP32_URL=http://192.168.1.100
```

Replace `192.168.1.100` with your ESP32's actual IP address.

### 3. Start the Monitoring Stack

Start InfluxDB and Grafana (without running the test yet):

```bash
docker-compose up -d influxdb grafana
```

This will start:
- **InfluxDB** on http://localhost:8086
- **Grafana** on http://localhost:3000

### 4. Access Grafana Dashboard

1. Open your browser and go to http://localhost:3000
2. Login credentials:
   - Username: `admin`
   - Password: `admin`
3. Navigate to **Dashboards** → **ESP32 Performance Test Dashboard**

The dashboard is pre-configured with:
- HTTP Requests per Second
- Current RPS gauge
- Virtual Users count
- HTTP Request Duration (avg, min, max)
- Response Time Percentiles (p50, p90, p99)
- Error Rate
- Total Failed Requests

### 5. Run the Performance Test

Execute the k6 test against your ESP32:

```bash
docker-compose --profile run up k6
```

Or, if you want to run it in the background:

```bash
docker-compose --profile run up -d k6
```

You can also run the test locally if you have k6 installed:

```bash
export ESP32_URL=http://192.168.1.100
k6 run --out influxdb=http://localhost:8086/k6 esp32-perftest.js
```

### 6. Monitor Results

While the test is running, watch the metrics in real-time on the Grafana dashboard at http://localhost:3000.

The test will run through the following stages:
1. Ramp up to 10 users over 30 seconds
2. Stay at 10 users for 1 minute
3. Ramp up to 20 users over 30 seconds
4. Stay at 20 users for 1 minute
5. Ramp up to 30 users over 30 seconds
6. Stay at 30 users for 1 minute
7. Ramp down to 0 users over 30 seconds

Total test duration: **5 minutes**

## Customizing the Test

### Modify Test Parameters

Edit `esp32-perftest.js` to customize:

- **Load stages**: Adjust the `stages` array in the `options` object
- **Thresholds**: Modify performance thresholds
- **Endpoints**: Add or modify the endpoints being tested
- **Think time**: Change the `sleep()` duration

Example: To test with higher load:

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};
```

### Test Different Endpoints

Modify the default function in `esp32-perftest.js` to test specific endpoints on your ESP32:

```javascript
export default function () {
  // Test your custom endpoints
  http.get(`${ESP32_URL}/api/sensor/temperature`);
  http.get(`${ESP32_URL}/api/sensor/humidity`);
  http.post(`${ESP32_URL}/api/led/toggle`, JSON.stringify({ state: 'on' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  sleep(1);
}
```

## Understanding the Metrics

### Requests per Second (RPS)
- Shows the number of HTTP requests being sent to your ESP32 per second
- Higher is better, but watch for errors as load increases

### Response Time
- **Average**: Mean response time across all requests
- **Min/Max**: Fastest and slowest response times
- Lower is better; indicates how quickly your ESP32 responds

### Percentiles
- **p50 (Median)**: 50% of requests are faster than this value
- **p90**: 90% of requests are faster than this value
- **p99**: 99% of requests are faster than this value
- These help identify outliers and worst-case scenarios

### Error Rate
- Percentage of failed requests
- Should be close to 0% for a healthy server

## Troubleshooting

### ESP32 Not Reachable

If k6 cannot reach your ESP32:

1. Verify the ESP32 is powered on and connected to the network
2. Ping the ESP32: `ping 192.168.1.100`
3. Check that the URL in `.env` is correct
4. Ensure your firewall allows connections

### Docker Issues

Stop all containers:

```bash
docker-compose down
```

Remove volumes (will delete stored metrics):

```bash
docker-compose down -v
```

Restart everything:

```bash
docker-compose up -d influxdb grafana
docker-compose --profile run up k6
```

### No Data in Grafana

1. Check that InfluxDB is running: `docker-compose ps`
2. Verify k6 is sending data: `docker-compose logs k6`
3. Check InfluxDB connection in Grafana: **Configuration** → **Data Sources** → **InfluxDB**

## Stopping the Services

Stop all services:

```bash
docker-compose down
```

To also remove stored data:

```bash
docker-compose down -v
```

## Advanced Usage

### Running Multiple Tests

You can run multiple tests and compare results:

```bash
# Test 1: Low load
ESP32_URL=http://192.168.1.100 docker-compose --profile run up k6

# Wait for test to complete, then run Test 2
# Modify esp32-perftest.js for different load profile
docker-compose --profile run up k6
```

All results will accumulate in InfluxDB and be visible in Grafana.

### Export Results

To export data from InfluxDB:

```bash
docker exec esp32-influxdb influx -database k6 -execute "SELECT * FROM http_req_duration" -format csv > results.csv
```

### Custom Grafana Dashboards

Create your own dashboards:
1. Go to Grafana (http://localhost:3000)
2. Click **+** → **Dashboard**
3. Add panels with queries against the InfluxDB data source
4. Available measurements: `http_reqs`, `http_req_duration`, `http_req_failed`, `vus`, etc.

## Project Structure

```
esp32-perftest/
├── docker-compose.yml              # Docker Compose configuration
├── esp32-perftest.js               # k6 test script
├── .env.example                    # Example environment variables
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── influxdb.yml       # InfluxDB datasource config
│   │   └── dashboards/
│   │       └── dashboards.yml     # Dashboard provisioning config
│   └── dashboards/
│       └── esp32-dashboard.json   # Pre-built Grafana dashboard
└── README.md                       # This file
```

## Performance Tips for ESP32

To get the best performance from your ESP32 web server:

1. **Keep responses small**: Minimize JSON payload sizes
2. **Use HTTP keep-alive**: Reduces connection overhead
3. **Enable caching**: Add appropriate cache headers
4. **Optimize endpoints**: Profile and optimize slow endpoints
5. **Monitor memory**: ESP32 has limited RAM; watch for memory leaks
6. **Use RTOS features**: Leverage FreeRTOS for concurrent request handling

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
