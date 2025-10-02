# S3 CORS Configuration Guide

## Overview

This guide provides CORS (Cross-Origin Resource Sharing) configuration for S3/MinIO to enable secure photo uploads from the GTSD web application.

## Why CORS is Required

When using presigned URLs for direct client-to-S3 uploads, the browser makes a PUT request to the S3 endpoint from a different origin (your web application). Without proper CORS configuration, browsers will block these requests due to the Same-Origin Policy.

## Development Environment (MinIO)

### Configuration via MinIO Console

1. Access the MinIO Console at `http://localhost:9001`
2. Navigate to **Buckets** > Select your bucket (e.g., `gtsd-photos`)
3. Go to **Access** > **CORS Configuration**
4. Add the following CORS rule:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Configuration via MinIO Client (mc)

```bash
# Install MinIO Client
brew install minio/stable/mc  # macOS
# or download from https://min.io/docs/minio/linux/reference/minio-mc.html

# Configure MinIO alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create CORS configuration file
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "http://localhost:5173"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "POST",
        "DELETE",
        "HEAD"
      ],
      "AllowedHeaders": [
        "*"
      ],
      "ExposeHeaders": [
        "ETag",
        "Content-Length"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS configuration
mc anonymous set-json cors.json local/gtsd-photos
```

### Configuration via Docker Compose

Add CORS environment variable to your MinIO service:

```yaml
services:
  minio:
    image: minio/minio:latest
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
      - MINIO_BROWSER_REDIRECT_URL=http://localhost:9001
    command: server /data --console-address ":9001"
    # After container starts, apply CORS via mc or console
```

## Production Environment (AWS S3)

### Configuration via AWS Console

1. Sign in to AWS Console and navigate to S3
2. Select your production bucket
3. Go to **Permissions** > **Cross-origin resource sharing (CORS)**
4. Click **Edit** and add:

```json
[
  {
    "AllowedOrigins": [
      "https://app.yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length",
      "Content-MD5",
      "x-amz-*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Configuration via AWS CLI

```bash
# Create CORS configuration file
cat > s3-cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://app.yourdomain.com"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "HEAD"
      ],
      "AllowedHeaders": [
        "Content-Type",
        "Content-Length",
        "Content-MD5",
        "x-amz-*"
      ],
      "ExposeHeaders": [
        "ETag"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket your-production-bucket \
  --cors-configuration file://s3-cors-config.json

# Verify CORS configuration
aws s3api get-bucket-cors --bucket your-production-bucket
```

### Configuration via Terraform

```hcl
resource "aws_s3_bucket_cors_configuration" "gtsd_photos" {
  bucket = aws_s3_bucket.gtsd_photos.id

  cors_rule {
    allowed_origins = ["https://app.yourdomain.com"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_headers = ["Content-Type", "Content-Length", "Content-MD5", "x-amz-*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
```

## CORS Configuration Breakdown

### AllowedOrigins
- **Development**: Use `http://localhost:3000` (or your dev server port)
- **Production**: Use your actual domain with HTTPS (e.g., `https://app.yourdomain.com`)
- **Security**: NEVER use `*` (wildcard) in production - always specify exact origins

### AllowedMethods
- **GET**: Required for downloading/viewing photos
- **PUT**: Required for uploading photos via presigned URLs
- **HEAD**: Used to check if objects exist (file verification)
- **DELETE**: Required if implementing client-side deletion
- **POST**: Optional, used for multipart uploads

### AllowedHeaders
- **Development**: `*` is acceptable for convenience
- **Production**: Specify exact headers:
  - `Content-Type`: Required for specifying file MIME type
  - `Content-Length`: File size information
  - `Content-MD5`: Optional integrity check
  - `x-amz-*`: AWS-specific headers for presigned URLs

### ExposeHeaders
- **ETag**: Exposes the file's entity tag to the client
- **Content-Length**: Allows client to see file size

### MaxAgeSeconds
- Browser cache duration for CORS preflight requests (OPTIONS)
- `3600` = 1 hour (good balance between performance and security)

## Testing CORS Configuration

### 1. Browser Developer Tools Test

```javascript
// Open browser console on your app and run:
fetch('http://localhost:9000/gtsd-photos/test.jpg', {
  method: 'HEAD'
})
  .then(response => console.log('CORS working:', response.status))
  .catch(error => console.error('CORS error:', error));
```

### 2. Presigned URL Upload Test

Use the actual presign endpoint to test:

```bash
# Get presigned URL
curl -X POST http://localhost:3001/v1/progress/photo/presign \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{
    "fileName": "test.jpg",
    "contentType": "image/jpeg",
    "fileSize": 1024000
  }'

# Upload a test file using the returned uploadUrl
# (Use the URL from the response above)
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@test-image.jpg"
```

### 3. Browser Preflight Test

Check for preflight (OPTIONS) requests in Network tab:

1. Open Developer Tools > Network tab
2. Filter by "XHR" or "Fetch"
3. Attempt a photo upload
4. Look for OPTIONS request to S3 endpoint
5. Verify response has CORS headers:
   - `access-control-allow-origin`
   - `access-control-allow-methods`
   - `access-control-allow-headers`

## Common Issues and Troubleshooting

### Issue 1: CORS Error in Browser Console

**Error**: `Access to fetch at 'http://localhost:9000/...' has been blocked by CORS policy`

**Solutions**:
1. Verify CORS configuration is applied to the correct bucket
2. Check that your app's origin matches AllowedOrigins exactly (including protocol and port)
3. Restart MinIO after configuration changes
4. Clear browser cache

### Issue 2: Preflight Request Fails

**Error**: `Response to preflight request doesn't pass access control check`

**Solutions**:
1. Add `OPTIONS` to AllowedMethods
2. Ensure `*` or specific headers are in AllowedHeaders
3. Check MaxAgeSeconds is set (browsers may cache preflight)

### Issue 3: Working in Development but Not Production

**Solutions**:
1. Verify production origin uses HTTPS (not HTTP)
2. Check for typos in domain name
3. Ensure no trailing slashes in origin URLs
4. Test with production domain, not IP address

### Issue 4: MinIO CORS Not Taking Effect

**Solutions**:
1. Restart MinIO container: `docker-compose restart minio`
2. Verify configuration: `mc anonymous get-json local/gtsd-photos`
3. Check MinIO logs for errors: `docker-compose logs minio`
4. Ensure bucket policy allows public read if needed

## Security Best Practices

### Development
- Use specific localhost ports instead of wildcards
- Keep separate buckets for dev/staging/production
- Use temporary credentials when possible

### Production
- **NEVER use `*` wildcard for AllowedOrigins** - specify exact domains
- Use HTTPS only for origins
- Limit AllowedMethods to only what's needed (GET, PUT, HEAD)
- Restrict AllowedHeaders to minimum required set
- Implement bucket policies to restrict access further
- Enable S3 access logging for audit trails
- Use CloudFront with signed URLs for additional security layer

### Additional Security Measures

```json
// Recommended production CORS with strict security
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://app.yourdomain.com"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "HEAD"
      ],
      "AllowedHeaders": [
        "Content-Type",
        "Content-Length",
        "x-amz-date",
        "x-amz-signature",
        "x-amz-credential",
        "x-amz-algorithm"
      ],
      "ExposeHeaders": [
        "ETag"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## Verification Checklist

- [ ] CORS configuration applied to correct bucket
- [ ] AllowedOrigins match your application domains exactly
- [ ] AllowedMethods include GET, PUT, HEAD at minimum
- [ ] AllowedHeaders sufficient for presigned URLs
- [ ] No wildcard (`*`) origins in production
- [ ] HTTPS used for production origins
- [ ] Tested actual photo upload flow end-to-end
- [ ] Browser console shows no CORS errors
- [ ] Preflight requests succeed (check Network tab)
- [ ] S3/MinIO logs show successful uploads

## References

- [AWS S3 CORS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [MinIO CORS Documentation](https://min.io/docs/minio/linux/administration/console.html#bucket-management)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Presigned URL Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
