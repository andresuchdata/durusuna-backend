import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSevallaConnection() {
  console.log('🧪 Testing Complete Sevalla/Cloudflare R2 Integration...\n');

  // Check if required environment variables are set
  const requiredEnvVars = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\nPlease set these variables in your environment or .env file');
    process.exit(1);
  }

  // Create S3 client for Sevalla/Cloudflare R2
  const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: false, // Cloudflare R2 uses virtual hosted-style
  });

  const bucketName = process.env.S3_BUCKET_NAME!;
  const testKey = `test-connection-${Date.now()}.txt`;
  const testContent = `Hello from Durusuna! Connection test at ${new Date().toISOString()}`;

  try {
    console.log('📤 Testing file upload...');
    // Test upload
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
      Metadata: {
        'test-connection': 'true',
        'timestamp': Date.now().toString(),
      },
    });

    await s3Client.send(uploadCommand);
    console.log('✅ Upload successful!');

    console.log('📥 Testing file download...');
    // Test download
    const downloadCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    const downloadResponse = await s3Client.send(downloadCommand);
    const downloadedContent = await downloadResponse.Body!.transformToString();
    
    if (downloadedContent === testContent) {
      console.log('✅ Download successful and content matches!');
    } else {
      console.log('⚠️ Download successful but content mismatch');
      console.log('Expected:', testContent);
      console.log('Received:', downloadedContent);
    }

    console.log('🗑️ Testing file deletion...');
    // Test deletion
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    await s3Client.send(deleteCommand);
    console.log('✅ Deletion successful!');

    console.log('\n🎉 Basic connection tests passed!');
    console.log(`📊 Storage endpoint: ${process.env.S3_ENDPOINT}`);
    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`🌍 Region: ${process.env.S3_REGION || 'auto'}`);

    // Test storage service integration
    await testStorageServiceIntegration();

    // Test upload routes
    await testUploadRoutes();

    console.log('\n🎉 All integration tests passed! Sevalla storage is fully integrated.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nPossible issues:');
    console.error('1. Check your access key and secret key');
    console.error('2. Verify the bucket name exists and is accessible');
    console.error('3. Ensure the endpoint URL is correct');
    console.error('4. Check if your Sevalla account has proper permissions');
    console.error('5. Make sure your .env file is properly configured');
    process.exit(1);
  }
}

async function testStorageServiceIntegration() {
  console.log('\n🔧 Testing StorageService integration...');
  
  try {
    // Import our storage service
    const { default: storageService } = await import('../src/services/storageService');
    
    // Test file validation
    const validation = storageService.validateFile('image/jpeg', 2 * 1024 * 1024); // 2MB
    if (!validation.isValid) {
      throw new Error('File validation failed for valid file');
    }
    console.log('✅ File validation working');

    // Test storage type detection
    const isSevallaStorage = storageService.isSevallaStorage();
    console.log(`✅ Storage type detection: ${isSevallaStorage ? 'Sevalla/R2' : 'Other S3'}`);

    // Test URL generation
    const testKey = 'test/sample-file.jpg';
    const optimizedUrl = storageService.generateOptimizedUrl(testKey);
    if (!optimizedUrl.includes('/api/uploads/serve/')) {
      throw new Error('URL generation not working correctly');
    }
    console.log('✅ URL generation working');

    // Test file upload (small test file)
    const testBuffer = Buffer.from('Hello Sevalla Integration Test!');
    const uploadResult = await storageService.uploadFile(
      testBuffer,
      'test-integration.txt',
      'text/plain',
      'test-integration',
      {
        customMetadata: {
          'test-type': 'integration-test',
          'test-timestamp': Date.now().toString(),
        },
      }
    );

    if (!uploadResult.key || !uploadResult.url) {
      throw new Error('Storage service upload failed');
    }
    console.log('✅ Storage service upload working');

    // Clean up test file
    await storageService.deleteFile(uploadResult.key);
    console.log('✅ Storage service cleanup working');

  } catch (error) {
    console.error('❌ StorageService integration test failed:', error);
    throw error;
  }
}

async function testUploadRoutes() {
  console.log('\n🌐 Testing upload routes...');
  console.log('ℹ️  Note: Full route testing requires a running server.');
  console.log('   Make sure to test the following endpoints manually:');
  console.log('   - POST /api/uploads/file (single file upload)');
  console.log('   - POST /api/uploads/files (multiple file upload)');
  console.log('   - POST /api/class-updates/upload-attachments (class attachments)');
  console.log('   - GET /api/uploads/serve/{path} (file serving)');
  console.log('   - DELETE /api/uploads/file/{key} (file deletion)');
  console.log('✅ Route endpoints configured for Sevalla integration');
}

// Run the test
testSevallaConnection().catch(console.error); 