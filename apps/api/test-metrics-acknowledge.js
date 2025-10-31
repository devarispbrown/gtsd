#!/usr/bin/env node

// Test script to validate metrics acknowledgment fix
const fetch = require('node-fetch');

async function testMetricsAcknowledgment() {
    const API_URL = 'http://localhost:3000';

    console.log('Testing metrics acknowledgment fix...\n');

    // First, we need a valid token - let's try to login
    try {
        // Try to login with test credentials
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
            console.log('Login failed:', loginData);
            console.log('\nNote: You need a valid user account to test this.');
            console.log('The fix has been applied to handle the SQL timestamp casting issue.');
            return;
        }

        const token = loginData.data.token;
        console.log('✓ Successfully logged in\n');

        // Get today's metrics first
        const metricsResponse = await fetch(`${API_URL}/v1/profile/metrics/today`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const metricsData = await metricsResponse.json();

        if (!metricsResponse.ok) {
            console.log('Failed to get metrics:', metricsData);
            return;
        }

        console.log('✓ Retrieved today\'s metrics');
        console.log('  BMI:', metricsData.data.metrics.bmi);
        console.log('  BMR:', metricsData.data.metrics.bmr);
        console.log('  TDEE:', metricsData.data.metrics.tdee);
        console.log('  Computed At:', metricsData.data.metrics.computedAt);
        console.log('  Version:', metricsData.data.metrics.version);
        console.log('  Acknowledged:', metricsData.data.acknowledged);
        console.log('');

        // Now try to acknowledge the metrics
        const ackResponse = await fetch(`${API_URL}/v1/profile/metrics/acknowledge`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: metricsData.data.metrics.version,
                metricsComputedAt: metricsData.data.metrics.computedAt
            })
        });

        const ackData = await ackResponse.json();

        if (!ackResponse.ok) {
            console.log('❌ Acknowledgment failed with status', ackResponse.status);
            console.log('Error:', ackData);

            // Check if it's the SQL error
            if (ackData.error && ackData.error.message && ackData.error.message.includes('syntax')) {
                console.log('\n⚠️  SQL Syntax Error Detected!');
                console.log('The timestamp casting issue is still present.');
            }
        } else {
            console.log('✅ Successfully acknowledged metrics!');
            console.log('  Acknowledged at:', ackData.data.acknowledgement.acknowledgedAt);
            console.log('\n🎉 Fix verified - the timestamp casting issue is resolved!');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        console.log('\nMake sure the API server is running on port 3000');
    }
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
    console.log('Installing node-fetch...');
    const { exec } = require('child_process');
    exec('npm install node-fetch@2', (error) => {
        if (error) {
            console.error('Failed to install node-fetch:', error);
            process.exit(1);
        }
        testMetricsAcknowledgment();
    });
} else {
    testMetricsAcknowledgment();
}