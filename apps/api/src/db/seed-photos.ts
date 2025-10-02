import { db } from './connection';
import { users, photos, taskEvidence, dailyTasks } from './schema';
import { logger } from '../config/logger';

/**
 * Seed script for progress photos
 * Creates sample photo records linked to existing users and tasks
 *
 * Note: This creates placeholder photo records in the database.
 * Actual image files need to be uploaded manually to MinIO at the specified keys.
 *
 * Run with: pnpm db:seed:photos
 */

interface SeedPhoto {
  userEmail: string;
  fileKey: string;
  fileSize: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/heic';
  width: number;
  height: number;
  takenAt: Date;
  taskTitle?: string; // Optional: link to task by title
  evidenceType?: 'before' | 'during' | 'after';
}

// Sample photo data
// Note: These file keys are placeholders. In a real scenario, you would:
// 1. Upload actual test images to MinIO at these keys
// 2. Or use actual presigned URLs to upload images first
const seedPhotosData: SeedPhoto[] = [
  // Alice's photos
  {
    userEmail: 'alice@example.com',
    fileKey: 'progress-photos/1/sample-front-before.jpg',
    fileSize: 2048576, // 2MB
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    takenAt: new Date('2025-09-15T08:00:00Z'),
    taskTitle: 'Morning workout',
    evidenceType: 'before',
  },
  {
    userEmail: 'alice@example.com',
    fileKey: 'progress-photos/1/sample-front-after.jpg',
    fileSize: 2156544, // 2.1MB
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    takenAt: new Date('2025-09-30T08:30:00Z'),
    taskTitle: 'Morning workout',
    evidenceType: 'after',
  },
  {
    userEmail: 'alice@example.com',
    fileKey: 'progress-photos/1/sample-meal.png',
    fileSize: 1536000, // 1.5MB
    mimeType: 'image/png',
    width: 1080,
    height: 1920,
    takenAt: new Date('2025-09-25T12:00:00Z'),
    taskTitle: 'Log breakfast',
    evidenceType: 'during',
  },
  // Bob's photos
  {
    userEmail: 'bob@example.com',
    fileKey: 'progress-photos/2/sample-side-before.jpg',
    fileSize: 2304512, // 2.2MB
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    takenAt: new Date('2025-09-10T07:00:00Z'),
    evidenceType: 'before',
  },
  {
    userEmail: 'bob@example.com',
    fileKey: 'progress-photos/2/sample-supplement.heic',
    fileSize: 1843200, // 1.75MB
    mimeType: 'image/heic',
    width: 2048,
    height: 1536,
    takenAt: new Date('2025-09-28T19:00:00Z'),
    taskTitle: 'Evening protein shake',
    evidenceType: 'during',
  },
];

async function seedPhotos() {
  try {
    logger.info('Starting photo seed...');

    // Get all users
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.email, u]));

    // Get all daily tasks
    const allTasks = await db.select().from(dailyTasks);
    const taskMap = new Map<string, typeof allTasks[0][]>();
    for (const task of allTasks) {
      const user = allUsers.find((u) => u.id === task.userId);
      if (user) {
        const key = `${user.email}:${task.title}`;
        if (!taskMap.has(key)) {
          taskMap.set(key, []);
        }
        taskMap.get(key)!.push(task);
      }
    }

    let photoCount = 0;
    let evidenceCount = 0;

    for (const photoData of seedPhotosData) {
      const user = userMap.get(photoData.userEmail);
      if (!user) {
        logger.warn({ email: photoData.userEmail }, 'User not found, skipping photo');
        continue;
      }

      // Create photo record
      const [photo] = await db
        .insert(photos)
        .values({
          userId: user.id,
          fileKey: photoData.fileKey,
          fileSize: photoData.fileSize,
          mimeType: photoData.mimeType,
          width: photoData.width,
          height: photoData.height,
          takenAt: photoData.takenAt,
        })
        .returning();

      photoCount++;
      logger.info(
        {
          photoId: photo.id,
          userId: user.id,
          fileKey: photo.fileKey,
        },
        'Photo created'
      );

      // Link to task if specified
      if (photoData.taskTitle && photoData.evidenceType) {
        const key = `${photoData.userEmail}:${photoData.taskTitle}`;
        const tasks = taskMap.get(key);

        if (tasks && tasks.length > 0) {
          // Link to the first matching task
          const task = tasks[0];

          await db.insert(taskEvidence).values({
            taskId: task.id,
            photoId: photo.id,
            evidenceType: photoData.evidenceType,
          });

          evidenceCount++;
          logger.info(
            {
              photoId: photo.id,
              taskId: task.id,
              evidenceType: photoData.evidenceType,
            },
            'Task evidence created'
          );
        } else {
          logger.warn(
            {
              email: photoData.userEmail,
              taskTitle: photoData.taskTitle,
            },
            'Task not found, photo not linked'
          );
        }
      }
    }

    logger.info(
      {
        photoCount,
        evidenceCount,
      },
      'Photo seed completed successfully'
    );

    logger.info(
      {
        note: 'Placeholder photo records created. To see actual images:',
        instructions: [
          '1. Upload test images to MinIO at the specified file keys',
          '2. Or use the presigned upload API to upload real images',
        ],
        exampleKeys: seedPhotosData.map((p) => p.fileKey),
      },
      'Photo seed instructions'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to seed photos');
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed
seedPhotos();
