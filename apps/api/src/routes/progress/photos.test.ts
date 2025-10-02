import request from 'supertest';
import { createApp } from '../../app';
import { db } from '../../db/connection';
import { users, photos, taskEvidence, dailyTasks } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Progress Photos API', () => {
  const app = createApp();
  let testUserId: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'photo-test@example.com',
        name: 'Photo Test User',
        phone: '+15551234567',
      })
      .returning();
    testUserId = user.id;

    // Create test task
    const [task] = await db
      .insert(dailyTasks)
      .values({
        userId: testUserId,
        title: 'Test workout',
        taskType: 'workout',
        dueDate: new Date(),
      })
      .returning();
    testTaskId = task.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('POST /v1/progress/photo/presign', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/v1/progress/photo/presign').send({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024000,
      });

      expect(response.status).toBe(401);
    });

    it('should generate presigned URL for valid request', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'test-photo.jpg',
          contentType: 'image/jpeg',
          fileSize: 2048576, // 2MB
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadUrl');
      expect(response.body.data).toHaveProperty('fileKey');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.uploadUrl).toContain('http');
      expect(response.body.data.fileKey).toMatch(/^progress-photos\/\d+\/.+\.jpg$/);
      expect(response.body.data.expiresIn).toBe(600);
    });

    it('should accept PNG images', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'test-photo.png',
          contentType: 'image/png',
          fileSize: 1536000, // 1.5MB
        });

      expect(response.status).toBe(200);
      expect(response.body.data.fileKey).toContain('.png');
    });

    it('should accept HEIC images', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'test-photo.heic',
          contentType: 'image/heic',
          fileSize: 1843200, // 1.75MB
        });

      expect(response.status).toBe(200);
      expect(response.body.data.fileKey).toContain('.heic');
    });

    it('should reject invalid content types', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'test.pdf',
          contentType: 'application/pdf',
          fileSize: 1024000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject files exceeding size limit', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'large-photo.jpg',
          contentType: 'image/jpeg',
          fileSize: 11 * 1024 * 1024, // 11MB
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File size');
    });

    it('should reject missing fileName', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          contentType: 'image/jpeg',
          fileSize: 1024000,
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing contentType', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'test.jpg',
          fileSize: 1024000,
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing fileSize', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
    });

    it('should validate fileName length', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'a'.repeat(256) + '.jpg',
          contentType: 'image/jpeg',
          fileSize: 1024000,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('File name');
    });

    it('should trim whitespace from fileName', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: '  test-photo.jpg  ',
          contentType: 'image/jpeg',
          fileSize: 1024000,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.fileKey).toContain('test-photo.jpg');
    });
  });

  describe('POST /v1/progress/photo/confirm', () => {
    let testFileKey: string;

    beforeEach(async () => {
      // Generate a presigned URL to get a valid file key
      const presignResponse = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'confirm-test.jpg',
          contentType: 'image/jpeg',
          fileSize: 2048576,
        });

      testFileKey = presignResponse.body.data.fileKey;
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/v1/progress/photo/confirm').send({
        fileKey: testFileKey,
      });

      expect(response.status).toBe(401);
    });

    it('should create photo record without task link', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          fileSize: 2048576,
          contentType: 'image/jpeg',
          width: 1920,
          height: 1080,
          takenAt: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('photoId');
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data.downloadUrl).toContain('http');

      // Verify photo was created in database
      const [photo] = await db
        .select()
        .from(photos)
        .where(eq(photos.id, response.body.data.photoId));

      expect(photo).toBeDefined();
      expect(photo.fileKey).toBe(testFileKey);
      expect(photo.userId).toBe(testUserId);

      // Clean up
      await db.delete(photos).where(eq(photos.id, photo.id));
    });

    it('should create photo record with task link', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          fileSize: 2048576,
          contentType: 'image/jpeg',
          width: 1920,
          height: 1080,
          taskId: testTaskId,
          evidenceType: 'before',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const photoId = response.body.data.photoId;

      // Verify task evidence was created
      const [evidence] = await db
        .select()
        .from(taskEvidence)
        .where(eq(taskEvidence.photoId, photoId));

      expect(evidence).toBeDefined();
      expect(evidence.taskId).toBe(testTaskId);
      expect(evidence.evidenceType).toBe('before');

      // Clean up
      await db.delete(photos).where(eq(photos.id, photoId));
    });

    it('should reject if taskId provided without evidenceType', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          taskId: testTaskId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('evidenceType');
    });

    it('should reject if task does not exist', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          taskId: 99999,
          evidenceType: 'before',
        });

      expect(response.status).toBe(404);
    });

    it('should reject if task belongs to another user', async () => {
      // Create another user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: 'other-user@example.com',
          name: 'Other User',
        })
        .returning();

      // Create task for other user
      const [otherTask] = await db
        .insert(dailyTasks)
        .values({
          userId: otherUser.id,
          title: 'Other task',
          taskType: 'workout',
          dueDate: new Date(),
        })
        .returning();

      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          taskId: otherTask.id,
          evidenceType: 'before',
        });

      expect(response.status).toBe(404);

      // Clean up
      await db.delete(users).where(eq(users.id, otherUser.id));
    });

    it('should accept valid evidenceType values', async () => {
      const evidenceTypes = ['before', 'during', 'after'];

      for (const evidenceType of evidenceTypes) {
        const presignResponse = await request(app)
          .post('/v1/progress/photo/presign')
          .set('X-User-Id', testUserId.toString())
          .send({
            fileName: `${evidenceType}-test.jpg`,
            contentType: 'image/jpeg',
            fileSize: 2048576,
          });

        const fileKey = presignResponse.body.data.fileKey;

        const response = await request(app)
          .post('/v1/progress/photo/confirm')
          .set('X-User-Id', testUserId.toString())
          .send({
            fileKey,
            fileSize: 2048576,
            contentType: 'image/jpeg',
            taskId: testTaskId,
            evidenceType,
          });

        expect(response.status).toBe(201);

        // Clean up
        await db.delete(photos).where(eq(photos.id, response.body.data.photoId));
      }
    });

    it('should reject if S3 file does not exist', async () => {
      // Use a fileKey that was never uploaded
      const fakeFileKey = `progress-photos/${testUserId}/fake-uuid-never-uploaded.jpg`;

      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: fakeFileKey,
          fileSize: 2048576,
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('File not found in storage');
    });

    it('should handle idempotent requests correctly', async () => {
      // First, create a photo
      const presignResponse = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: 'idempotent-test.jpg',
          contentType: 'image/jpeg',
          fileSize: 2048576,
        });

      const fileKey = presignResponse.body.data.fileKey;

      const firstConfirm = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey,
          fileSize: 2048576,
          contentType: 'image/jpeg',
          width: 1920,
          height: 1080,
        });

      expect(firstConfirm.status).toBe(201);
      const firstPhotoId = firstConfirm.body.data.photoId;

      // Second confirm with same fileKey should be idempotent
      const secondConfirm = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey,
          fileSize: 2048576,
          contentType: 'image/jpeg',
          width: 1920,
          height: 1080,
        });

      expect(secondConfirm.status).toBe(200); // 200 not 201
      expect(secondConfirm.body.data.photoId).toBe(firstPhotoId);
      expect(secondConfirm.body.data).toHaveProperty('downloadUrl');

      // Verify only one photo was created
      const allPhotos = await db
        .select()
        .from(photos)
        .where(eq(photos.fileKey, fileKey));

      expect(allPhotos.length).toBe(1);

      // Clean up
      await db.delete(photos).where(eq(photos.id, firstPhotoId));
    });

    it('should reject missing fileSize in confirm request', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          contentType: 'image/jpeg',
          // Missing fileSize
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('fileSize');
    });

    it('should reject missing contentType in confirm request', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          fileSize: 2048576,
          // Missing contentType
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('contentType');
    });

    it('should reject invalid contentType in confirm request', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          fileSize: 2048576,
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Content type must be one of');
    });

    it('should reject fileSize exceeding maximum in confirm request', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          fileSize: 11 * 1024 * 1024, // 11MB, exceeds 10MB limit
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('File size must be less than');
    });

    it('should reject negative fileSize in confirm request', async () => {
      const response = await request(app)
        .post('/v1/progress/photo/confirm')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileKey: testFileKey,
          fileSize: -100,
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('File size must be positive');
    });
  });

  describe('GET /v1/progress/photos', () => {
    let photoIds: number[] = [];

    beforeAll(async () => {
      // Create test photos
      for (let i = 0; i < 5; i++) {
        const [photo] = await db
          .insert(photos)
          .values({
            userId: testUserId,
            fileKey: `progress-photos/${testUserId}/test-${i}.jpg`,
            fileSize: 2048576,
            mimeType: 'image/jpeg',
            width: 1920,
            height: 1080,
          })
          .returning();

        photoIds.push(photo.id);
      }
    });

    afterAll(async () => {
      // Clean up test photos
      for (const id of photoIds) {
        await db.delete(photos).where(eq(photos.id, id));
      }
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/v1/progress/photos');

      expect(response.status).toBe(401);
    });

    it('should return user photos with default pagination', async () => {
      const response = await request(app)
        .get('/v1/progress/photos')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('photos');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.photos)).toBe(true);
      expect(response.body.data.photos.length).toBeGreaterThan(0);
      expect(response.body.data.photos[0]).toHaveProperty('downloadUrl');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/v1/progress/photos?limit=2')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.photos.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should respect offset parameter', async () => {
      const response = await request(app)
        .get('/v1/progress/photos?offset=2')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.offset).toBe(2);
    });

    it('should reject limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/v1/progress/photos?limit=101')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(400);
    });

    it('should reject negative offset', async () => {
      const response = await request(app)
        .get('/v1/progress/photos?offset=-1')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(400);
    });

    it('should filter by taskId when provided', async () => {
      // Link a photo to task
      await db.insert(taskEvidence).values({
        taskId: testTaskId,
        photoId: photoIds[0],
        evidenceType: 'before',
      });

      const response = await request(app)
        .get(`/v1/progress/photos?taskId=${testTaskId}`)
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.photos.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.photos[0]).toHaveProperty('evidenceType');

      // Clean up
      await db.delete(taskEvidence).where(eq(taskEvidence.photoId, photoIds[0]));
    });

    it('should only return photos belonging to authenticated user', async () => {
      const response = await request(app)
        .get('/v1/progress/photos')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);

      // All returned photos should belong to test user
      for (const photo of response.body.data.photos) {
        expect(photo.fileKey).toContain(`progress-photos/${testUserId}/`);
      }
    });
  });

  describe('DELETE /v1/progress/photo/:photoId', () => {
    let testPhotoId: number;
    let testPhotoKey: string;

    beforeEach(async () => {
      testPhotoKey = `progress-photos/${testUserId}/delete-test.jpg`;

      const [photo] = await db
        .insert(photos)
        .values({
          userId: testUserId,
          fileKey: testPhotoKey,
          fileSize: 2048576,
          mimeType: 'image/jpeg',
        })
        .returning();

      testPhotoId = photo.id;
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(`/v1/progress/photo/${testPhotoId}`);

      expect(response.status).toBe(401);
    });

    it('should delete photo successfully', async () => {
      const response = await request(app)
        .delete(`/v1/progress/photo/${testPhotoId}`)
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify photo was deleted from database
      const [deletedPhoto] = await db.select().from(photos).where(eq(photos.id, testPhotoId));

      expect(deletedPhoto).toBeUndefined();
    });

    it('should return 404 for non-existent photo', async () => {
      const response = await request(app)
        .delete('/v1/progress/photo/99999')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(404);
    });

    it('should return 404 when trying to delete another user photo', async () => {
      // Create another user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: 'other-user-delete@example.com',
          name: 'Other User',
        })
        .returning();

      // Create photo for other user
      const [otherPhoto] = await db
        .insert(photos)
        .values({
          userId: otherUser.id,
          fileKey: `progress-photos/${otherUser.id}/other-photo.jpg`,
          fileSize: 2048576,
          mimeType: 'image/jpeg',
        })
        .returning();

      const response = await request(app)
        .delete(`/v1/progress/photo/${otherPhoto.id}`)
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(404);

      // Clean up
      await db.delete(users).where(eq(users.id, otherUser.id));
    });

    it('should cascade delete task evidence', async () => {
      // Link photo to task
      await db.insert(taskEvidence).values({
        taskId: testTaskId,
        photoId: testPhotoId,
        evidenceType: 'before',
      });

      const response = await request(app)
        .delete(`/v1/progress/photo/${testPhotoId}`)
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);

      // Verify evidence was also deleted
      const [deletedEvidence] = await db
        .select()
        .from(taskEvidence)
        .where(eq(taskEvidence.photoId, testPhotoId));

      expect(deletedEvidence).toBeUndefined();
    });

    it('should reject invalid photoId format', async () => {
      const response = await request(app)
        .delete('/v1/progress/photo/invalid')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(400);
    });
  });
});
