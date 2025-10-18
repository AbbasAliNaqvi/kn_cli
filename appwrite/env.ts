import {
  API_BASE_URL,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID,
  APPWRITE_NGO_COLLECTION_ID,
  APPWRITE_REPORTS_COLLECTION_ID,
  APPWRITE_STORAGE_ID,
} from '@env';

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  // The 'platform' is usually your app's bundle identifier and can be hardcoded
  platform: 'com.karunanidhan.app', 
  projectId: APPWRITE_PROJECT_ID || '',
  databaseId: APPWRITE_DATABASE_ID || '',
  userCollectionId: APPWRITE_USER_COLLECTION_ID || '',
  ngoCollectionId: APPWRITE_NGO_COLLECTION_ID || '',
  reportsCollectionId: APPWRITE_REPORTS_COLLECTION_ID || '',
  storageId: APPWRITE_STORAGE_ID || '',
};


// 🔥 CRITICAL DEBUG: Log configuration on import
console.log('🔧 APPWRITE CONFIGURATION LOADED:');
console.log('📍 Endpoint:', appwriteConfig.endpoint);
console.log('📱 Platform:', appwriteConfig.platform);
console.log('🆔 Project ID:', appwriteConfig.projectId ? '[SET]' : '❌ MISSING');
console.log('🗄️ Database ID:', appwriteConfig.databaseId ? '[SET]' : '❌ MISSING');


// 🔥 CRITICAL DEBUG: Log raw environment variables
console.log('\n🌍 RAW ENVIRONMENT VARIABLES (from @env):');
console.log('APPWRITE_ENDPOINT:', APPWRITE_ENDPOINT);
console.log('APPWRITE_PROJECT_ID:', APPWRITE_PROJECT_ID);


// 🚨 VALIDATION: Check for critical missing values
const missingConfigs = [];
if (!appwriteConfig.projectId) missingConfigs.push('APPWRITE_PROJECT_ID');
if (!appwriteConfig.databaseId) missingConfigs.push('APPWRITE_DATABASE_ID');


if (missingConfigs.length > 0) {
  console.error('❌ CRITICAL APPWRITE CONFIG MISSING:');
  missingConfigs.forEach(config => console.error(`   - ${config}`));
  console.error('📋 Check your .env file!');
}


// 🔥 NETWORK VALIDATION: Test Appwrite endpoint reachability
const validateAppwriteEndpoint = async () => {
  try {
    console.log('🌐 Testing Appwrite endpoint connectivity...');
    const response = await fetch(`${appwriteConfig.endpoint}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    console.log('✅ Appwrite endpoint reachable:', response.status);
    
    if (response.ok) {
      const health = await response.json();
      console.log('🏥 Appwrite health:', health);
    }
  } catch (error) {
    console.error('❌ Appwrite endpoint test failed:', error);
    console.error('🔍 This might explain the "Network request failed" error');
  }
};


// Run validation after a short delay to avoid blocking app startup
setTimeout(validateAppwriteEndpoint, 1000);


// 🔥 DJANGO API VALIDATION: Test your Django server too
const validateDjangoAPI = async () => {
  const djangoUrl = API_BASE_URL;
  console.log('\n🔍 DJANGO API CONFIGURATION:');
  console.log('API_BASE_URL:', djangoUrl);
  
  if (!djangoUrl) {
    console.error('❌ CRITICAL: API_BASE_URL is not set in .env file!');
    return;
  }
  
  try {
    console.log('🌐 Testing Django API connectivity...');
    const response = await fetch(`${djangoUrl}/health/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    console.log('✅ Django API reachable:', response.status);
  } catch (error) {
    console.error('❌ Django API test failed:', error);
    console.error('🔍 This explains why RTK Query might be failing');
  }
};


// Test Django API too
setTimeout(validateDjangoAPI, 1500);


export default appwriteConfig;
