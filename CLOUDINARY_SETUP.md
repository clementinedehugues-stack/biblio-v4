# Cloudinary Configuration Guide

## ✅ Completed Setup

The backend has been configured to use **Cloudinary** for persistent file storage, solving Render's ephemeral storage issue.

### Changes Made:

1. ✅ Added `cloudinary==1.41.0` to requirements.txt
2. ✅ Added Cloudinary config to `core/config.py`
3. ✅ Created `services/cloudinary_service.py` for upload/download/streaming
4. ✅ Added `cloudinary_public_id` and `cloudinary_thumbnail_id` to Book model
5. ✅ Created Alembic migration `ba7520fe521b`
6. ✅ Updated upload endpoint to store on Cloudinary
7. ✅ Updated stream endpoint with Cloudinary + local fallback

---

## 🔧 Render Configuration (REQUIRED)

### Your Cloudinary Credentials:
```
Cloud Name: dngdws04i
API Key: 498235921414657
API Secret: Djz3nYDwJXTtb0UcqPyZjlj2j1Q
```

### Steps to Configure Render:

1. **Go to Render Dashboard**
   - Navigate to: https://dashboard.render.com
   - Select your backend service: **biblio-h6ji**

2. **Add Environment Variables**
   - Click on **Environment** in the left sidebar
   - Click **Add Environment Variable**
   
3. **Add These 3 Variables:**
   ```
   CLOUDINARY_CLOUD_NAME = dngdws04i
   CLOUDINARY_API_KEY = 498235921414657
   CLOUDINARY_API_SECRET = Djz3nYDwJXTtb0UcqPyZjlj2j1Q
   ```

4. **Save and Deploy**
   - Click **Save Changes**
   - Render will automatically redeploy with:
     - `cloudinary` package installed
     - Alembic migration executed (adds new fields)
     - Cloudinary service active

---

## 📝 How It Works

### Upload Flow:
1. User uploads PDF via admin/moderator interface
2. Backend receives file → uploads to Cloudinary
3. Cloudinary stores PDF + generates thumbnail
4. Backend saves `cloudinary_public_id` and `cloudinary_thumbnail_id` in database
5. Files persist even after Render redeploy ✅

### Stream Flow:
1. Frontend requests PDF with stream token
2. Backend checks if `book.cloudinary_public_id` exists
3. If yes → streams from Cloudinary CDN (fast, global)
4. If no → falls back to local storage (legacy books)

### Thumbnail Flow:
- Thumbnails served directly via Cloudinary URL
- Automatic CDN caching
- Responsive transformations (300x400, quality:auto)

---

## 🧪 Testing

After configuring Render:

1. **Upload a new PDF:**
   - Login as admin/moderator
   - Go to upload page
   - Upload a PDF → should see "Upload successful"

2. **Verify Storage:**
   - Check Cloudinary console: https://console.cloudinary.com/
   - Navigate to **Media Library** → `biblio/pdfs/` folder
   - Should see your uploaded PDF

3. **Test Streaming:**
   - Open the book detail page
   - Click "Read" → PDF should load quickly
   - Check browser network tab → URL should be from Cloudinary

4. **Test Persistence:**
   - Trigger a Render redeploy (push any change)
   - After redeploy, PDF should still load ✅

---

## 🎯 Benefits

- ✅ **Persistent Storage**: Files survive Render redeploys
- ✅ **CDN Delivery**: Fast loading from global CDN
- ✅ **Free Tier**: 25GB storage + 25GB bandwidth/month
- ✅ **Auto Thumbnails**: Cloudinary handles image transformations
- ✅ **No Migration**: Old books use local fallback
- ✅ **Scalable**: Production-ready architecture

---

## 🔒 Security

- Cloudinary URLs are signed (secure=True)
- Stream tokens still validated before access
- API credentials stored in Render environment (not in code)

---

## 📊 Free Tier Limits

Cloudinary Free Plan:
- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Requests**: Unlimited

This is sufficient for ~100-200 PDFs (avg 100-200MB each).

---

## 🚀 Next Steps

1. Configure Render environment variables (see above)
2. Wait for automatic redeploy (~2-3 minutes)
3. Upload a new PDF to test
4. Verify files persist after redeploy
5. Enjoy permanent file storage! 🎉
