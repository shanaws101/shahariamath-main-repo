const DEFAULT_WHATSAPP_NUMBER = "8801787494113";

export function normalizeWhatsAppLink(value?: string | null) {
  const raw = (value || DEFAULT_WHATSAPP_NUMBER).trim();
  if (raw.includes('wa.me/') || raw.includes('whatsapp.com/')) {
    try {
      const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      const phone = url.searchParams.get('phone') || url.pathname.split('/').filter(Boolean).pop();
      const digitsFromUrl = phone?.replace(/[^0-9]/g, '');
      if (digitsFromUrl) return `https://wa.me/${digitsFromUrl}`;
    } catch {
      // Fall through to digit-only normalization.
    }
  }
  const digits = raw.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits || DEFAULT_WHATSAPP_NUMBER}`;
}