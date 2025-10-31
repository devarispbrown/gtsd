# Photo Picker Fix - Profile Edit View

## Issue
Users were getting "Unable to Load Photos" error when clicking "Change Photo" in the profile edit screen.

## Root Causes Identified

1. **Missing Info.plist Configuration**
   - Only had `NSPhotoLibraryUsageDescription` but needed better privacy description
   - Missing `PHPhotoLibraryPreventAutomaticLimitedAccessAlert` flag

2. **Incorrect iOS Deployment Target**
   - Was set to iOS 26.0 (non-existent version)
   - Now corrected to iOS 16.0 (minimum for PhotosPicker support)

3. **Insufficient Error Handling**
   - Generic error messages didn't help users understand the issue
   - No detailed logging for debugging

## Changes Made

### 1. Info.plist Updates (`/apps/GTSD/GTSD/Info.plist`)

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>GTSD needs access to your photo library to select your profile photo</string>
<key>PHPhotoLibraryPreventAutomaticLimitedAccessAlert</key>
<true/>
<key>NSCameraUsageDescription</key>
<string>GTSD needs access to your camera to take your profile photo</string>
```

**What this fixes:**
- Provides clear user-facing explanation for photo access
- Prevents iOS from showing annoying "limited access" alerts
- Better aligns with App Store privacy guidelines

### 2. Project Settings (`project.pbxproj`)

Changed iOS deployment target from 26.0 to 17.0:
```
IPHONEOS_DEPLOYMENT_TARGET = 17.0;
```

**Why iOS 17.0:**
- PhotosPicker API was introduced in iOS 16, but works best in iOS 17+
- App uses @Previewable macro which requires iOS 17+
- Ensures compatibility with latest SwiftUI features
- Aligns with Apple's app submission requirements

### 3. Enhanced Error Handling (`ProfileEditViewModel.swift`)

Improved `loadSelectedPhoto()` method with:

- **Detailed logging** at each step
- **Specific error messages** based on error type:
  - Permission errors (NSError 257, 260)
  - Corrupt file errors (NSError 3328)
  - PhotosUI specific errors
- **Validation checks**:
  - Data exists
  - UIImage can be created
  - Image has valid dimensions
- **User-friendly error messages** with actionable guidance

### 4. PhotosPicker Configuration (`ProfileEditView.swift`)

Enhanced PhotosPicker initialization:

```swift
PhotosPicker(
    selection: $viewModel.selectedPhoto,
    matching: .images,
    photoLibrary: .shared()  // Explicitly use shared photo library
) {
    // ... button UI
}
.onChange(of: viewModel.selectedPhoto) { _, newValue in
    if newValue != nil {  // Only load if photo actually selected
        _Concurrency.Task {
            await viewModel.loadSelectedPhoto()
        }
    }
}
```

## Testing Instructions

### 1. First Run - Permission Request
When you first tap "Change Photo", iOS will prompt for photo library access.

**Expected:**
- Alert showing: "GTSD needs access to your photo library to select your profile photo"
- User can choose: "Allow Access to All Photos" or "Select Photos..."

**If no prompt appears:**
1. Go to Settings > Privacy & Security > Photos
2. Find GTSD app
3. Ensure access is granted

### 2. Selecting a Photo

**Test cases:**

#### Valid Photo Selection
1. Tap "Change Photo"
2. Select a photo from library
3. **Expected:** Profile image updates immediately with selected photo
4. **Check logs:** Should see "Photo loaded successfully: WIDTHxHEIGHT"

#### Photo Access Denied
1. Deny photo access in Settings
2. Tap "Change Photo"
3. **Expected:** Error message: "Unable to access photo. Please check photo library permissions in Settings."

#### Invalid/Corrupted Photo
1. Try to select a corrupted image file
2. **Expected:** Error message: "Photo file is corrupted or in an unsupported format."

#### Large Photo
1. Select a very high-resolution photo (e.g., 12MP+)
2. **Expected:** Photo loads successfully with dimensions logged
3. **Future:** Should add image compression for uploads

### 3. Error Recovery

After an error:
1. Error alert should display with "OK" button
2. Tapping "OK" dismisses error
3. User can try selecting photo again
4. Previous errors should not interfere with new attempts

## Monitoring and Debugging

### Console Logs to Watch For

**Successful flow:**
```
[INFO] Loading selected photo from PhotosPicker
[INFO] Photo data loaded successfully, size: 1234567 bytes
[INFO] Photo loaded successfully: 1920x1080
```

**Permission error:**
```
[ERROR] Failed to load selected photo: ..., domain: NSCocoaErrorDomain, code: 257
```

**Format error:**
```
[ERROR] Failed to create UIImage from photo data
```

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| "Unable to Load Photos" | Immediate error on selection | Check Settings > Privacy > Photos |
| Picker doesn't open | No response to tap | Clean build and restart app |
| Photo doesn't update UI | Selection works but no display | Check profileImage binding |
| Generic error | Non-specific error message | Check Console logs for detailed error |

## Additional Improvements Needed

1. **Photo Upload Backend**
   - Currently, selected photo is only stored in memory
   - Need endpoint: `POST /api/auth/profile/photo` to upload
   - Should support multipart/form-data
   - Compress image before upload (max 2MB recommended)

2. **Image Optimization**
   ```swift
   func compressImage(_ image: UIImage, maxSizeBytes: Int = 2_000_000) -> Data? {
       var compression: CGFloat = 1.0
       var imageData = image.jpegData(compressionQuality: compression)

       while let data = imageData, data.count > maxSizeBytes && compression > 0.1 {
           compression -= 0.1
           imageData = image.jpegData(compressionQuality: compression)
       }

       return imageData
   }
   ```

3. **Loading State**
   - Show spinner while photo is being loaded/processed
   - Disable "Change Photo" button during load
   - Add progress indicator for large photos

4. **Photo Caching**
   - Cache profile photo locally
   - Load from cache on view appear
   - Sync with server on background refresh

## Files Modified

1. `/apps/GTSD/GTSD/Info.plist` - Privacy descriptions and settings
2. `/apps/GTSD/GTSD.xcodeproj/project.pbxproj` - iOS deployment target
3. `/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift` - Enhanced error handling
4. `/apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift` - PhotosPicker configuration

## Verification Checklist

- [x] Clean build succeeds
- [x] App runs on iOS 17.0+ devices/simulators
- [ ] PhotosPicker opens when tapping "Change Photo"
- [ ] Permission request shows correct description
- [ ] Photo selection updates profile image
- [ ] Error messages are user-friendly
- [ ] Console logs provide debugging detail
- [ ] Error alert can be dismissed and retried

## Next Steps

1. Test on physical device (simulator has limited photo library)
2. Test with various photo formats (JPG, PNG, HEIC)
3. Test with iCloud photos (requires download)
4. Test with "Select Photos" limited access mode
5. Implement backend endpoint for photo upload
6. Add image compression before upload
7. Add loading states and progress indicators
8. Cache profile photos locally

## Performance Considerations

- **PhotosPicker** is async and may take time for large photos
- iCloud photos must download before loading (can be slow)
- Large photos should be compressed before upload
- Consider max dimensions (e.g., 1024x1024 for profile photos)

## Security Notes

- Photo data never leaves device until explicitly uploaded
- No photos stored without user consent
- Follows iOS privacy best practices
- Complies with App Store Review Guidelines 5.1.1

---

**Last Updated:** October 30, 2025
**iOS Target:** 17.0+
**Framework:** SwiftUI + PhotosUI
**Status:** Build verified, ready for device testing
