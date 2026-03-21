/**
 * Simple Node.js Mock Backend Server
 * Serves test data for HD2D mobile app development
 * Runs on port 8787 to mimic Cloudflare Workers locally
 */

const http = require('http');
const url = require('url');

// Test credentials
const TEST_USERS = {
  'test.company@hardcoredoortodoorclosers.com': {
    password: 'TestCompany123!',
    id: 'company-1',
    name: 'Test Company',
    type: 'company',
  },
  'test.rep@hardcoredoortodoorclosers.com': {
    password: 'TestRep123!',
    id: 'rep-1',
    name: 'Test Rep',
    type: 'sales_rep',
  },
  'admin@hardcoredoortodoorclosers.com': {
    password: 'AdminTest123!',
    id: 'admin-1',
    name: 'Admin',
    type: 'admin',
  },
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-company-id');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);

  // Health check
  if (pathname === '/' || pathname === '/api') {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'HD2D Backend API (Mock)',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Login endpoint
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = TEST_USERS[email];

        if (user && user.password === password) {
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            token: `test-${user.type}-token-${Date.now()}`,
            user: {
              id: user.id,
              email,
              name: user.name,
              user_type: user.type,
            },
          }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid credentials',
          }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
    return;
  }

  // Register endpoint (mock)
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Registration successful (mock)',
      requires2FA: true,
      email: 'user@example.com',
    }));
    return;
  }

  // Verify 2FA endpoint (mock)
  if (pathname === '/api/auth/verify-2fa' && req.method === 'POST') {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: '2FA verified',
      token: `verified-token-${Date.now()}`,
    }));
    return;
  }

  // Leads endpoints (mock)
  if (pathname.startsWith('/api/leads')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: [],
      message: 'Leads data',
    }));
    return;
  }

  // Deals endpoints (mock)
  if (pathname.startsWith('/api/deals')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: [],
      message: 'Deals data',
    }));
    return;
  }

  // Posts/Social endpoints (mock)
  if (pathname.startsWith('/api/posts')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: [],
      message: 'Posts data',
    }));
    return;
  }

  // Events endpoints (mock)
  if (pathname.startsWith('/api/events')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: [],
      message: 'Events data',
    }));
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: 'Not found',
  }));
});

const PORT = 8787;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Mock Backend Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend running on http://localhost:8081\n`);
  console.log('Test Credentials:');
  console.log('  Company: test.company@hardcoredoortodoorclosers.com / TestCompany123!');
  console.log('  Sales Rep: test.rep@hardcoredoortodoorclosers.com / TestRep123!');
  console.log('  Admin: admin@hardcoredoortodoorclosers.com / AdminTest123!\n');
});
