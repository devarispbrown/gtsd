import request from 'supertest';
import { createApp } from '../app';

describe('Metrics Routes', () => {
  const app = createApp();

  describe('GET /metrics', () => {
    it('should return 200 with Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('should include default Node.js metrics', async () => {
      const response = await request(app).get('/metrics');

      // Check for common Prometheus metrics
      expect(response.text).toContain('process_cpu_user_seconds_total');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
    });

    it('should include custom HTTP metrics', async () => {
      // Make a request to generate metrics
      await request(app).get('/healthz');

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });
  });
});