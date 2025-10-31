#!/usr/bin/env node

const fetch = require('node-fetch');

// First, get today's metrics to see what timestamp format is returned
async function testAcknowledgment() {
  const baseUrl = 'http://localhost:3000/v1';

  // You'll need a valid token - this is a placeholder
  // In reality, you'd need to login first to get a token
  const token = 'YOUR_JWT_TOKEN_HERE';

  try {
    // Step 1: Get today's metrics
    console.log("Step 1: Fetching today's metrics...");
    const metricsResponse = await fetch(`${baseUrl}/profile/metrics/today`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!metricsResponse.ok) {
      console.error(
        'Failed to fetch metrics:',
        metricsResponse.status,
        await metricsResponse.text()
      );
      return;
    }

    const metricsData = await metricsResponse.json();
    console.log('Metrics response:', JSON.stringify(metricsData, null, 2));

    if (!metricsData.success || !metricsData.data) {
      console.error('Invalid metrics response');
      return;
    }

    const { metrics } = metricsData.data;
    console.log('\nExtracted metrics:');
    console.log('- computedAt:', metrics.computedAt);
    console.log('- version:', metrics.version);

    // Step 2: Try to acknowledge with the exact timestamp received
    console.log('\nStep 2: Acknowledging metrics...');
    const acknowledgeResponse = await fetch(`${baseUrl}/profile/metrics/acknowledge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: metrics.version,
        metricsComputedAt: metrics.computedAt,
      }),
    });

    const acknowledgeData = await acknowledgeResponse.json();
    console.log(
      'Acknowledge response:',
      acknowledgeResponse.status,
      JSON.stringify(acknowledgeData, null, 2)
    );
  } catch (error) {
    console.error('Error:', error);
  }
}

// Note: You need to get a valid JWT token first
console.log('NOTE: This test requires a valid JWT token.');
console.log('You can get one by logging in via the API or mobile app.');
console.log('Update the token variable in the script before running.\n');

// Uncomment when you have a valid token
// testAcknowledgment();
