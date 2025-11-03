import 'dotenv/config';

const API_URL = 'http://localhost:3000';
let authToken = '';
let chatId = '';

async function testChatAPI() {
  console.log('🧪 Testing Chat API...\n');

  try {
    // 1. Login first
    console.log('1️⃣  Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com', // Change this to your test user
        password: 'password123',
      }),
    });
    
    if (!loginRes.ok) {
      console.error('❌ Login failed. Please create a test user first.');
      console.log('💡 You can sign up at POST /auth/signup');
      return;
    }
    
    const loginData = await loginRes.json();
    authToken = loginData.token;
    console.log('✅ Logged in successfully\n');

    // 2. Create a new chat
    console.log('2️⃣  Creating a new chat...');
    const createChatRes = await fetch(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Test Chat' }),
    });
    
    const createChatData = await createChatRes.json();
    chatId = createChatData.chat.id;
    console.log('✅ Chat created:', chatId, '\n');

    // 3. Send a message and get streaming response
    console.log('3️⃣  Sending message and streaming response...');
    console.log('📤 Message: "Hello! Tell me a short joke."\n');
    
    const messageRes = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        content: 'Hello! Tell me a short joke.',
      }),
    });

    if (!messageRes.ok) {
      console.error('❌ Failed to send message');
      return;
    }

    console.log('🤖 AI Response (streaming):');
    const reader = messageRes.body?.getReader();
    const decoder = new TextDecoder();
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        process.stdout.write(chunk);
      }
    }
    
    console.log('\n\n✅ Message sent and response received\n');

    // 4. Get all chats
    console.log('4️⃣  Fetching all chats...');
    const chatsRes = await fetch(`${API_URL}/api/chats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const chatsData = await chatsRes.json();
    console.log('✅ Total chats:', chatsData.chats.length);
    console.log('📋 Chats:', chatsData.chats.map((c: any) => ({
      id: c.id,
      title: c.title,
      messages: c.messageCount,
    })), '\n');

    // 5. Get specific chat with messages
    console.log('5️⃣  Fetching chat details...');
    const chatDetailsRes = await fetch(`${API_URL}/api/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const chatDetailsData = await chatDetailsRes.json();
    console.log('✅ Chat details retrieved');
    console.log('💬 Messages:', chatDetailsData.chat.messages.length, '\n');

    // 6. Update chat title
    console.log('6️⃣  Updating chat title...');
    const updateRes = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Updated Test Chat' }),
    });
    
    const updateData = await updateRes.json();
    console.log('✅ Chat title updated:', updateData.chat.title, '\n');

    // 7. Delete chat
    console.log('7️⃣  Deleting chat...');
    const deleteRes = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const deleteData = await deleteRes.json();
    console.log('✅ Chat deleted:', deleteData.success, '\n');

    console.log('🎉 All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testChatAPI();

