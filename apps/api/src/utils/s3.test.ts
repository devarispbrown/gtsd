import { getPresignedUploadUrl, getPresignedDownloadUrl } from './s3';

describe('S3 Utils', () => {
  describe('getPresignedUploadUrl', () => {
    it('should generate a presigned upload URL', async () => {
      const key = 'test-file.txt';
      const url = await getPresignedUploadUrl(key);

      expect(url).toContain(key);
      expect(url).toContain('X-Amz-Algorithm');
      expect(url).toContain('X-Amz-Signature');
    });

    it('should use default expiry of 600 seconds', async () => {
      const key = 'test-file.txt';
      const url = await getPresignedUploadUrl(key);

      expect(url).toContain('X-Amz-Expires=600');
    });

    it('should accept custom expiry time', async () => {
      const key = 'test-file.txt';
      const url = await getPresignedUploadUrl(key, 300);

      expect(url).toContain('X-Amz-Expires=300');
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate a presigned download URL', async () => {
      const key = 'test-file.txt';
      const url = await getPresignedDownloadUrl(key);

      expect(url).toContain(key);
      expect(url).toContain('X-Amz-Algorithm');
      expect(url).toContain('X-Amz-Signature');
    });

    it('should use default expiry of 600 seconds', async () => {
      const key = 'test-file.txt';
      const url = await getPresignedDownloadUrl(key);

      expect(url).toContain('X-Amz-Expires=600');
    });

    it('should accept custom expiry time', async () => {
      const key = 'test-file.txt';
      const url = await getPresignedDownloadUrl(key, 1800);

      expect(url).toContain('X-Amz-Expires=1800');
    });
  });
});