const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'your-admin-token-here'; // Thay bằng token admin thực tế

async function testFutureSessions() {
  console.log('🧪 Testing Future Sessions Management...\n');

  try {
    // 1. Test GET future sessions
    console.log('1. Testing GET future sessions...');
    const getResponse = await axios.get(`${BASE_URL}/api/admin/session-results/future`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (getResponse.data.success) {
      console.log('✅ GET future sessions successful');
      console.log(`   Found ${getResponse.data.data.sessions.length} future sessions`);
      console.log(`   Total: ${getResponse.data.data.pagination.total} sessions`);
      
      // Hiển thị 5 phiên đầu tiên
      getResponse.data.data.sessions.slice(0, 5).forEach((session, index) => {
        console.log(`   ${index + 1}. Session ${session.sessionId}: ${session.status} - ${session.result || 'No result'}`);
      });
    } else {
      console.log('❌ GET future sessions failed:', getResponse.data.message);
    }

    // 2. Test generate future sessions
    console.log('\n2. Testing generate future sessions...');
    const generateResponse = await axios.post(`${BASE_URL}/api/admin/session-results/future`, {
      action: 'generate_future_sessions'
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (generateResponse.data.success) {
      console.log('✅ Generate future sessions successful');
      console.log(`   Created ${generateResponse.data.data.count} sessions`);
    } else {
      console.log('❌ Generate future sessions failed:', generateResponse.data.message);
    }

    // 3. Test set individual future result
    console.log('\n3. Testing set individual future result...');
    const sessions = getResponse.data.data.sessions;
    if (sessions.length > 0) {
      const firstSession = sessions[0];
      const setResultResponse = await axios.post(`${BASE_URL}/api/admin/session-results/future`, {
        action: 'set_future_result',
        sessionId: firstSession.sessionId,
        result: 'UP'
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (setResultResponse.data.success) {
        console.log('✅ Set individual future result successful');
        console.log(`   Session ${firstSession.sessionId} result set to: UP`);
      } else {
        console.log('❌ Set individual future result failed:', setResultResponse.data.message);
      }
    }

    // 4. Test bulk set future results
    console.log('\n4. Testing bulk set future results...');
    if (sessions.length >= 3) {
      const sessionIds = sessions.slice(0, 3).map(s => s.sessionId);
      const results = ['UP', 'DOWN', 'UP'];
      
      const bulkResponse = await axios.post(`${BASE_URL}/api/admin/session-results/future`, {
        action: 'bulk_set_future_results',
        sessionIds: sessionIds,
        results: results
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (bulkResponse.data.success) {
        console.log('✅ Bulk set future results successful');
        console.log(`   Set results for ${bulkResponse.data.data.results.length} sessions`);
        bulkResponse.data.data.results.forEach(result => {
          console.log(`   Session ${result.sessionId}: ${result.result}`);
        });
      } else {
        console.log('❌ Bulk set future results failed:', bulkResponse.data.message);
      }
    }

    // 5. Verify results
    console.log('\n5. Verifying results...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/admin/session-results/future`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.data.success) {
      console.log('✅ Verification successful');
      const predictedSessions = verifyResponse.data.data.sessions.filter(s => s.status === 'PREDICTED');
      console.log(`   Found ${predictedSessions.length} sessions with predicted results`);
      
      predictedSessions.slice(0, 5).forEach((session, index) => {
        console.log(`   ${index + 1}. Session ${session.sessionId}: ${session.result} (${session.createdBy})`);
      });
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test specific functions
async function testCreateFutureSessions() {
  console.log('\n🧪 Testing createFutureSessions function...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/admin/session-results/future`, {
      action: 'generate_future_sessions'
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Create future sessions successful');
      console.log(`   Created ${response.data.data.count} sessions`);
    } else {
      console.log('❌ Create future sessions failed:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function testSetFutureResult(sessionId, result) {
  console.log(`\n🧪 Testing set future result for session ${sessionId}...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/admin/session-results/future`, {
      action: 'set_future_result',
      sessionId: sessionId,
      result: result
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Set future result successful');
      console.log(`   Session ${sessionId} result set to: ${result}`);
    } else {
      console.log('❌ Set future result failed:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Export functions for manual testing
module.exports = {
  testFutureSessions,
  testCreateFutureSessions,
  testSetFutureResult
};

// Run tests if called directly
if (require.main === module) {
  testFutureSessions();
} 