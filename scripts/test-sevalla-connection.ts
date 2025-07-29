import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSevallaConnection() {
  console.log('🧪 Testing Sevalla/Cloudflare R2 connection...\n');

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

    console.log('\n🎉 All tests passed! Sevalla storage is properly configured.');
    console.log(`📊 Storage endpoint: ${process.env.S3_ENDPOINT}`);
    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`🌍 Region: ${process.env.S3_REGION || 'auto'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nPossible issues:');
    console.error('1. Check your access key and secret key');
    console.error('2. Verify the bucket name exists and is accessible');
    console.error('3. Ensure the endpoint URL is correct');
    console.error('4. Check if your Sevalla account has proper permissions');
    process.exit(1);
  }
}

// Run the test
testSevallaConnection().catch(console.error); 