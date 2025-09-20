const ALLOWED_DOMAIN = 'aether.deepakpatnaik.com';
const BOSS_EMAIL = 'deepakpatnaik1@gmail.com';

export const validateDomain = (): boolean => {
  const currentHost = window.location.hostname;

  console.log('🔒 Domain validation:', {
    current: currentHost,
    allowed: ALLOWED_DOMAIN,
    isValid: currentHost === ALLOWED_DOMAIN
  });

  return currentHost === ALLOWED_DOMAIN;
};

export const enforceProductionDomain = () => {
  if (!validateDomain()) {
    const message = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #000;
        color: #ff0000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        z-index: 999999;
      ">
        <h1 style="font-size: 48px; margin-bottom: 20px;">ACCESS DENIED</h1>
        <p style="font-size: 24px; margin-bottom: 10px;">This application is only accessible at:</p>
        <p style="font-size: 32px; color: #fff; margin-bottom: 30px;">${ALLOWED_DOMAIN}</p>
        <p style="font-size: 18px; color: #888;">Current domain: ${window.location.hostname}</p>
        <p style="font-size: 18px; color: #888; margin-top: 50px;">Boss-only application for ${BOSS_EMAIL}</p>
      </div>
    `;

    document.body.innerHTML = message;

    setTimeout(() => {
      window.location.href = `https://${ALLOWED_DOMAIN}`;
    }, 5000);

    throw new Error(`Domain validation failed. Only ${ALLOWED_DOMAIN} is allowed.`);
  }
};

export const validateOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return url.hostname === ALLOWED_DOMAIN;
  } catch {
    return false;
  }
};