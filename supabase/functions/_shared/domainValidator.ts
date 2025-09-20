export const ALLOWED_DOMAIN = 'aether.deepakpatnaik.com';
export const BOSS_EMAIL = 'deepakpatnaik1@gmail.com';

export function validateDomain(req: Request): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  console.log('🔒 Domain validation check:', { origin, referer, host });

  // Check all possible sources
  const isValidOrigin = origin?.includes(ALLOWED_DOMAIN);
  const isValidReferer = referer?.includes(ALLOWED_DOMAIN);
  const isValidHost = host === ALLOWED_DOMAIN || host === `${ALLOWED_DOMAIN}:443`;

  const isValid = isValidOrigin || isValidReferer || isValidHost;

  if (!isValid) {
    console.log('❌ Domain validation failed - Access denied', {
      origin,
      referer,
      host,
      allowed: ALLOWED_DOMAIN
    });
  }

  return isValid;
}

export function createDomainErrorResponse() {
  return new Response(JSON.stringify({
    error: `Access denied. This API is only accessible from ${ALLOWED_DOMAIN}`,
    message: 'Boss-only application'
  }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': `https://${ALLOWED_DOMAIN}`
    }
  });
}