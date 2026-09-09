/**
 * Generates a deterministic device fingerprint based on STABLE browser/device properties.
 *
 * IMPORTANT: We deliberately exclude unstable signals like canvas rendering and
 * hardwareConcurrency because they change across browser updates, GPU driver
 * changes, cache clears, and private mode — which produced false-positive
 * "untrusted device" blocks for legitimate users on the same device.
 */
export function generateDeviceFingerprint(): string {
  const components = [
    // Reduced UA: only browser family + major OS, not full version string
    getStableUserAgent(),
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.maxTouchPoints || 0,
    (navigator as any).platform || 'unknown',
  ];

  return hashCode(components.join('|||'));
}

function getStableUserAgent(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser}|${os}`;
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  return 'df_' + Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Gets a human-readable device label like "Chrome on Windows"
 */
export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}
