# Photo Upload Feature - Local Testing Setup

## ✅ Setup Complete!

All services are now running and configured for local testing of the photo upload feature.

### Running Services

1. **MinIO (S3)**: http://localhost:9000
   - Console: http://localhost:9001
   - Credentials: `minioadmin` / `minioadmin`
   - Bucket: `gtsd-progress-photos` (created and configured)

2. **PostgreSQL**: localhost:5434
   - Database: `gtsd`
   - User: `gtsd`
   - All migrations applied (including 0006_progress_photos.sql)

3. **Redis**: localhost:6382

4. **API Server**: http://localhost:3000
   - Health: http://localhost:3000/healthz
   - Metrics: http://localhost:3000/metrics

### API Endpoints for Photo Upload

#### 1. Generate Presigned Upload URL
```bash
curl -X POST http://localhost:3000/v1/progress/photo/presign \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{
    "fileName": "my-progress-photo.jpg",
    "contentType": "image/jpeg",
    "fileSize": 2048000
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "http://localhost:9000/gtsd-progress-photos/progress-photos/1/uuid-my-progress-photo.jpg?X-Amz-...",
    "fileKey": "progress-photos/1/uuid-my-progress-photo.jpg",
    "expiresIn": 600
  }
}
```

#### 2. Upload Photo to S3 (Direct Upload)
```bash
# Use the uploadUrl from step 1
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/path/to/your/photo.jpg"
```

#### 3. Confirm Upload and Create DB Record
```bash
curl -X POST http://localhost:3000/v1/progress/photo/confirm \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{
    "fileKey": "progress-photos/1/uuid-my-progress-photo.jpg",
    "fileSize": 2048000,
    "contentType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "taskId": 1,
    "evidenceType": "before"
  }'
```

#### 4. List Your Photos
```bash
curl -X GET "http://localhost:3000/v1/progress/photos?limit=10" \
  -H "x-user-id: 1"
```

#### 5. Delete a Photo
```bash
curl -X DELETE http://localhost:3000/v1/progress/photo/1 \
  -H "x-user-id: 1"
```

### Test Data

**Users:**
- Alice (id: 1, email: alice@example.com)
- Bob (id: 2, email: bob@example.com)

**Tasks with Photos:**
- Task ID 1: "Morning workout" (Alice) - has 2 photos (before/after)
- Task ID 2: "Log breakfast" (Alice) - has 1 photo (during)
- Task ID 3: "Evening protein shake" (Bob) - has 1 photo (during)

**Seeded Photos (placeholders in DB):**
- 5 photo records created
- File keys are placeholders (actual files not uploaded yet)
- You can view them in MinIO or query the database

### Manual Testing Checklist

#### Test 1: Upload a New Photo
1. ✅ Request presigned URL: `POST /v1/progress/photo/presign`
2. ✅ Upload file directly to S3 using the presigned URL
3. ✅ Confirm upload: `POST /v1/progress/photo/confirm`
4. ✅ Verify file appears in MinIO browser (http://localhost:9001)
5. ✅ Verify database record created: `SELECT * FROM photos WHERE id = <new_id>;`

#### Test 2: URL Expiry
1. ✅ Request presigned URL
2. ⏰ Wait 10+ minutes
3. ✅ Try to upload (should fail with 403 Forbidden)
4. ✅ Request new presigned URL
5. ✅ Upload should succeed with new URL

#### Test 3: Link Photo to Task
1. ✅ Upload photo with `taskId` and `evidenceType` in confirm request
2. ✅ Verify task_evidence record created
3. ✅ Query photos by task: `GET /v1/progress/photos?taskId=1`

#### Test 4: Validation Tests
1. ✅ Try invalid content type (should fail): `"contentType": "image/gif"`
2. ✅ Try file too large (should fail): `"fileSize": 11000000` (>10MB)
3. ✅ Try confirm without S3 upload (should fail with 404)
4. ✅ Try to access another user's photo (should fail with 404)

#### Test 5: Idempotency
1. ✅ Upload and confirm a photo
2. ✅ Confirm again with same fileKey (should return existing photo with 200, not 201)
3. ✅ Verify only one database record exists

### Database Queries

```sql
-- View all photos
SELECT * FROM photos ORDER BY created_at DESC;

-- View task evidence links
SELECT te.*, p.file_key, dt.title as task_title
FROM task_evidence te
JOIN photos p ON te.photo_id = p.id
JOIN daily_tasks dt ON te.task_id = dt.id;

-- View photos with download URLs (need to generate via API)
-- Use: GET /v1/progress/photos
```

### MinIO Browser

Access MinIO Console:
1. Open: http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Navigate to `gtsd-progress-photos` bucket
4. View uploaded photos
5. Download/delete files

### Troubleshooting

**Server not running?**
```bash
# Check background processes
ps aux | grep "tsx watch"

# Restart server
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm dev
```

**Database connection issues?**
```bash
# Check if container is running
docker ps | grep gtsd-postgres

# Start if needed
docker start gtsd-postgres
```

**MinIO not accessible?**
```bash
# Check if container is running
docker ps | grep minio

# Start if needed
docker start kite-minio
```

**Check API logs:**
```bash
# View server output
tail -f /dev/null  # Server is running in background, check terminal
```

### Next Steps

1. **Mobile Testing**: Start the mobile app and test photo picker/upload UI
2. **Integration Testing**: Test complete workflow: capture -> upload -> link to task
3. **Performance Testing**: Upload multiple photos, test concurrent uploads
4. **CORS Testing**: Test uploads from mobile app (not curl)

### Important Notes

- ⚠️ Presigned URLs expire in 10 minutes
- ⚠️ Max file size: 10MB
- ⚠️ Supported formats: JPEG, PNG, HEIC
- ⚠️ File keys include UUID to prevent collisions
- ⚠️ Direct S3 upload means API never handles file data (scalable!)
- ⚠️ Photos are deleted from S3 when deleted via API

## Production Deployment Checklist

Before deploying to production:

1. ✅ Configure real S3 bucket (not MinIO)
2. ✅ Set restrictive CORS policy (no wildcards)
3. ✅ Use environment-specific credentials
4. ✅ Enable S3 bucket versioning
5. ✅ Set up S3 lifecycle policies for old files
6. ✅ Configure CloudFront CDN for downloads
7. ✅ Enable S3 access logging
8. ✅ Review and fix P1+ issues from code review
9. ✅ Run full test suite
10. ✅ Load test photo upload endpoints

---

**Feature Status**: ✅ Ready for Local Testing
**Production Ready**: ⚠️ After P1 fixes (see code review)
**Code Review Score**: 8.2/10
