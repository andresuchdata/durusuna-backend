import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugRailwaySevallaIssue() {
  console.log('🚂 Railway Sevalla Storage Debug Tool\n');
  console.log('=====================================\n');

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  console.log('------------------------------');
  
  const requiredVars = [
    'S3_ENDPOINT',
    'S3_ACCESS_KEY', 
    'S3_SECRET_KEY',
    'S3_BUCKET_NAME',
    'S3_REGION'
  ];

  let missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: NOT SET`);
      missingVars.push(varName);
    } else {
      // Show partial value for security
      const displayValue = varName.includes('KEY') ? 
        `${value.substring(0, 8)}...` : 
        value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n🚨 CRITICAL: Missing ${missingVars.length} environment variable(s) in Railway:`);
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n📝 To fix this in Railway:');
    console.log('   1. Go to your Railway project dashboard');
    console.log('   2. Click on "Variables" tab');
    console.log('   3. Add the missing environment variables');
    console.log('   4. Redeploy your service');
    return;
  }

  // Test storage configuration
  console.log('\n🔧 Storage Configuration Test:');
  console.log('-----------------------------');
  
  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: false, // Cloudflare R2 uses virtual hosted-style
    });
    
    console.log('✅ S3 Client initialization: SUCCESS');
    
    // Test endpoint format
    const endpoint = process.env.S3_ENDPOINT!;
    if (endpoint.includes('cloudflarestorage.com')) {
      console.log('✅ Endpoint format: Cloudflare R2 (correct)');
    } else {
      console.log('⚠️  Endpoint format: Not Cloudflare R2');
      console.log(`   Current: ${endpoint}`);
      console.log('   Expected format: https://[account-id].r2.cloudflarestorage.com');
    }
    
  } catch (error) {
    console.log('❌ S3 Client initialization: FAILED');
    console.log(`   Error: ${(error as Error).message}`);
    return;
  }

  // Test basic connectivity
  console.log('\n🌐 Network Connectivity Test:');
  console.log('-----------------------------');
  
  try {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { S3Client } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: false,
    });

    const testKey = `railway-debug-test-${Date.now()}.txt`;
    const testContent = 'Railway debug test';
    
    console.log('🔄 Testing upload to Sevalla...');
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
    });

    await s3Client.send(command);
    console.log('✅ Upload test: SUCCESS');
    
    // Clean up test file
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: testKey,
    });
    
    await s3Client.send(deleteCommand);
    console.log('✅ Cleanup: SUCCESS');
    
  } catch (error) {
    console.log('❌ Connectivity test: FAILED');
    console.log(`   Error: ${(error as Error).message}`);
    
    // Provide specific error guidance
    const errorMsg = (error as Error).message;
    console.log('\n🔍 Error Analysis:');
    
    if (errorMsg.includes('InvalidAccessKeyId')) {
      console.log('   → Check your S3_ACCESS_KEY in Railway variables');
    } else if (errorMsg.includes('SignatureDoesNotMatch')) {
      console.log('   → Check your S3_SECRET_KEY in Railway variables');
    } else if (errorMsg.includes('NoSuchBucket')) {
      console.log('   → Check your S3_BUCKET_NAME in Railway variables');
    } else if (errorMsg.includes('NetworkingError') || errorMsg.includes('timeout')) {
      console.log('   → Network connectivity issue from Railway to Sevalla');
    } else if (errorMsg.includes('AccessDenied')) {
      console.log('   → Check bucket permissions in your Sevalla dashboard');
    } else {
      console.log('   → Unexpected error - check all credentials');
    }
    
    return;
  }

  // Success summary
  console.log('\n🎉 All tests passed!');
  console.log('========================');
  console.log('Your Sevalla storage is properly configured in Railway.');
  console.log('The 500 error might be caused by:');
  console.log('1. Authentication middleware issues');
  console.log('2. Database connectivity problems');
  console.log('3. File validation logic');
  console.log('4. Request parsing issues');
  console.log('\nCheck Railway logs for the specific error details.');
}

// Run the debug
debugRailwaySevallaIssue().catch(console.error); 