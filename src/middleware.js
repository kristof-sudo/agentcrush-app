import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Only protect mission-control
  if (!pathname.startsWith('/mission-control')) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')

  const username = process.env.MISSION_CONTROL_USERNAME
  const password = process.env.MISSION_CONTROL_PASSWORD

  if (authHeader) {
    const base64 = authHeader.split(' ')[1]
    const decoded = Buffer.from(base64, 'base64').toString()
    const [user, pass] = decoded.split(':')

    if (user === username && pass === password) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Mission Control"',
    },
  })
}

export const config = {
  matcher: ['/mission-control/:path*'],
}
