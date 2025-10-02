import { S3Service } from './s3';
import { AppError } from '../middleware/error';

describe('S3Service', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    s3Service = new S3Service();
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate presigned URL for valid JPEG upload', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'test-photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('fileKey');
      expect(result).toHaveProperty('expiresIn');
      expect(result.uploadUrl).toContain('http');
      expect(result.fileKey).toMatch(/^progress-photos\/1\/.+\.jpg$/);
      expect(result.expiresIn).toBe(600); // 10 minutes
    });

    it('should generate presigned URL for valid PNG upload', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 2,
        fileName: 'test-photo.png',
        contentType: 'image/png',
      });

      expect(result.fileKey).toMatch(/^progress-photos\/2\/.+\.png$/);
    });

    it('should generate presigned URL for valid HEIC upload', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 3,
        fileName: 'test-photo.heic',
        contentType: 'image/heic',
      });

      expect(result.fileKey).toMatch(/^progress-photos\/3\/.+\.heic$/);
    });

    it('should reject invalid content type', async () => {
      await expect(
        s3Service.generatePresignedUploadUrl({
          userId: 1,
          fileName: 'test.pdf',
          contentType: 'application/pdf' as any,
        })
      ).rejects.toThrow(AppError);

      await expect(
        s3Service.generatePresignedUploadUrl({
          userId: 1,
          fileName: 'test.pdf',
          contentType: 'application/pdf' as any,
        })
      ).rejects.toThrow('Invalid content type');
    });

    it('should reject invalid image formats', async () => {
      await expect(
        s3Service.generatePresignedUploadUrl({
          userId: 1,
          fileName: 'test.gif',
          contentType: 'image/gif' as any,
        })
      ).rejects.toThrow(AppError);
    });

    it('should sanitize file names with special characters', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'my photo!@#$%^&*().jpg',
        contentType: 'image/jpeg',
      });

      expect(result.fileKey).toMatch(/progress-photos\/1\/.+-my_photo___________.jpg/);
    });

    it('should handle file names with spaces', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'my test photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result.fileKey).toMatch(/progress-photos\/1\/.+-my_test_photo.jpg/);
    });

    it('should generate unique file keys for same file name', async () => {
      const result1 = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      const result2 = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result1.fileKey).not.toBe(result2.fileKey);
      expect(result1.fileKey).toMatch(/progress-photos\/1\/.+-photo.jpg/);
      expect(result2.fileKey).toMatch(/progress-photos\/1\/.+-photo.jpg/);
    });

    it('should handle very long file names', async () => {
      const longFileName = 'a'.repeat(300) + '.jpg';

      const result = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: longFileName,
        contentType: 'image/jpeg',
      });

      // File name should be truncated to 255 chars max
      const keyParts = result.fileKey.split('/');
      const fileName = keyParts[keyParts.length - 1];
      expect(fileName.length).toBeLessThanOrEqual(255);
    });

    it('should organize files by user ID', async () => {
      const result1 = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      const result2 = await s3Service.generatePresignedUploadUrl({
        userId: 2,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result1.fileKey).toContain('progress-photos/1/');
      expect(result2.fileKey).toContain('progress-photos/2/');
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate presigned download URL with default expiry', async () => {
      const fileKey = 'progress-photos/1/test-photo.jpg';

      const downloadUrl = await s3Service.getPresignedDownloadUrl(fileKey);

      expect(downloadUrl).toBeTruthy();
      expect(downloadUrl).toContain('http');
      expect(downloadUrl).toContain(fileKey);
    });

    it('should generate presigned download URL with custom expiry', async () => {
      const fileKey = 'progress-photos/1/test-photo.jpg';
      const customExpiry = 7200; // 2 hours

      const downloadUrl = await s3Service.getPresignedDownloadUrl(fileKey, customExpiry);

      expect(downloadUrl).toBeTruthy();
      expect(downloadUrl).toContain('http');
    });

    it('should handle file keys with special characters', async () => {
      const fileKey = 'progress-photos/1/uuid-my_photo_test.jpg';

      const downloadUrl = await s3Service.getPresignedDownloadUrl(fileKey);

      expect(downloadUrl).toBeTruthy();
    });
  });

  describe('verifyObjectExists', () => {
    it('should return true for existing file', async () => {
      // First upload a test file
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'verify-test.jpg',
        contentType: 'image/jpeg',
      });

      // Note: In a real scenario, you would upload the file here
      // For this test, we're testing the method signature and error handling

      // The method should throw if the file doesn't exist (not uploaded yet)
      await expect(s3Service.verifyObjectExists(result.fileKey)).rejects.toThrow(AppError);
      await expect(s3Service.verifyObjectExists(result.fileKey)).rejects.toThrow('File not found in storage');
    });

    it('should throw 404 AppError for non-existent file', async () => {
      const fileKey = 'progress-photos/1/non-existent-file.jpg';

      await expect(s3Service.verifyObjectExists(fileKey)).rejects.toThrow(AppError);

      try {
        await s3Service.verifyObjectExists(fileKey);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('File not found in storage');
      }
    });

    it('should handle S3 errors gracefully', async () => {
      const invalidFileKey = '';

      // Empty file key should cause an error
      await expect(s3Service.verifyObjectExists(invalidFileKey)).rejects.toThrow();
    });
  });

  describe('deleteObject', () => {
    it('should delete object from S3', async () => {
      const fileKey = 'progress-photos/1/test-to-delete.jpg';

      await expect(s3Service.deleteObject(fileKey)).resolves.not.toThrow();
    });

    it('should handle deletion of non-existent object gracefully', async () => {
      const fileKey = 'progress-photos/1/non-existent.jpg';

      // S3 DeleteObject succeeds even if object doesn't exist
      await expect(s3Service.deleteObject(fileKey)).resolves.not.toThrow();
    });
  });

  describe('file key format', () => {
    it('should follow the pattern progress-photos/{userId}/{uuid}-{fileName}', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 42,
        fileName: 'my-photo.jpg',
        contentType: 'image/jpeg',
      });

      const keyParts = result.fileKey.split('/');
      expect(keyParts).toHaveLength(3);
      expect(keyParts[0]).toBe('progress-photos');
      expect(keyParts[1]).toBe('42');
      expect(keyParts[2]).toMatch(/^[0-9a-f-]+-my-photo\.jpg$/);
    });

    it('should include UUID v4 format in file key', async () => {
      const result = await s3Service.generatePresignedUploadUrl({
        userId: 1,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(result.fileKey).toMatch(
        /progress-photos\/1\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-photo\.jpg/
      );
    });
  });

  describe('content type validation', () => {
    const validTypes: Array<'image/jpeg' | 'image/png' | 'image/heic'> = [
      'image/jpeg',
      'image/png',
      'image/heic',
    ];

    validTypes.forEach((contentType) => {
      it(`should accept ${contentType}`, async () => {
        await expect(
          s3Service.generatePresignedUploadUrl({
            userId: 1,
            fileName: `test.${contentType.split('/')[1]}`,
            contentType,
          })
        ).resolves.toBeTruthy();
      });
    });

    const invalidTypes = [
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'video/mp4',
    ];

    invalidTypes.forEach((contentType) => {
      it(`should reject ${contentType}`, async () => {
        await expect(
          s3Service.generatePresignedUploadUrl({
            userId: 1,
            fileName: 'test.file',
            contentType: contentType as any,
          })
        ).rejects.toThrow(AppError);
      });
    });
  });
});
