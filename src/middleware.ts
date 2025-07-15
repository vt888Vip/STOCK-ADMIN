import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Danh sách domain được phép truy cập (local dev)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

// Các header bảo mật
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// Hàm thiết lập CORS headers
function setCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  const isAllowedOrigin = allowedOrigins.includes(origin) || origin.startsWith('http://localhost');

  // Xử lý preflight request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, origin);
  }

  let response = NextResponse.next();

  // Thêm CORS nếu là origin hợp lệ
  if (isAllowedOrigin) {
    response = setCorsHeaders(response, origin);
  }

  // Cho phép tất cả static files
  const isStatic = pathname.includes('.') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/public/');

  if (isStatic) {
    return response;
  }

  // Cho phép mọi request mà không kiểm tra đăng nhập
  // (Client sẽ tự xử lý nếu cần auth)
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|.*\\..*|images/.*|icons/.*|assets/.*|public/.*).*)',
  ],
};
