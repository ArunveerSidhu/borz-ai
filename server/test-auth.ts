/**
 * Simple script to test REST auth endpoints
 * Run with: npx tsx test-auth.ts
 */

const API_URL = 'http://localhost:3000';

interface ApiResponse {
  user?: any;
  token?: string;
  error?: string;
  [key: string]: any;
}

async function callApi(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`\n🔵 ${method} ${endpoint}`);
  if (body) console.log(`📤 Body:`, body);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse = await response.json();

    if (!response.ok) {
      console.log(`❌ Error (${response.status}):`, data.error || data);
      return null;
    }

    console.log(`✅ Success (${response.status}):`, data);
    return data;
  } catch (error) {
    console.error(`❌ Request failed:`, error);
    return null;
  }
}

async function testAuth() {
  console.log('🚀 Starting REST API Auth Tests\n');
  console.log('=' .repeat(50));

  // 1. Test health check
  await callApi('/health');

  // 2. Test signup
  const email = `test${Date.now()}@example.com`;
  const signupResult = await callApi('/auth/signup', 'POST', {
    name: 'Test User',
    email: email,
    password: 'TestPass123!',
  });

  if (!signupResult) {
    console.log('\n❌ Signup failed, stopping tests');
    return;
  }

  const { token } = signupResult;
  console.log(`\n✅ Signed up as: ${email}`);

  // 3. Test me endpoint (protected)
  await callApi('/auth/me', 'GET', undefined, token);

  // 4. Test check endpoint
  await callApi('/auth/check', 'GET', undefined, token);

  // 5. Test login
  await callApi('/auth/login', 'POST', {
    email: email,
    password: 'TestPass123!',
  });

  // 6. Test forgot password
  const forgotResult = await callApi('/auth/forgot-password', 'POST', {
    email: email,
  });

  // 7. Test me without token (should fail)
  console.log('\n🔵 Testing protected route without token:');
  await callApi('/auth/me', 'GET');

  // 8. Test check without token
  await callApi('/auth/check', 'GET');

  // 9. Test login with wrong password
  console.log('\n🔵 Testing login with wrong password:');
  await callApi('/auth/login', 'POST', {
    email: email,
    password: 'WrongPassword123!',
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ REST API Auth Tests Complete!\n');
}

// Run tests
testAuth().catch(console.error);
