import { db } from '../db/DatabaseClient';

// Palavras reservadas que não podem ser usadas como slugs personalizados para evitar conflito com rotas
export const RESERVED_SLUGS = new Set([
  'admin',
  'dashboard',
  'login',
  'stats',
  'api',
  'health',
  'expired',
  'password',
  'profile',
  'static',
  'assets',
  'help'
]);

/**
 * Valida se uma string é uma URL válida. Se não tiver protocolo, adiciona http:// para verificar.
 */
export function validateUrl(url: string): { isValid: boolean; formattedUrl: string } {
  let cleanUrl = url.trim();
  if (!cleanUrl) return { isValid: false, formattedUrl: '' };

  // Adicionar http:// se não houver protocolo para validar corretamente
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  try {
    const parsed = new URL(cleanUrl);
    // Verificar se possui um domínio válido (com um ponto) e não é apenas localhost ou IP inválido
    const hostname = parsed.hostname;
    const hasDot = hostname.includes('.');
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    return {
      isValid: hasDot || isLocal,
      formattedUrl: cleanUrl
    };
  } catch (_) {
    return { isValid: false, formattedUrl: '' };
  }
}

/**
 * Verifica se um slug é válido e não conflita com palavras reservadas
 */
export function isValidSlug(slug: string): { isValid: boolean; message: string } {
  const cleanSlug = slug.trim().toLowerCase();
  
  if (!cleanSlug) {
    return { isValid: false, message: 'O apelido não pode estar em branco.' };
  }
  
  // Apenas letras minúsculas/maiúsculas, números e traço
  const regex = /^[a-zA-Z0-9-_]+$/;
  if (!regex.test(cleanSlug)) {
    return { isValid: false, message: 'O apelido só pode conter letras, números e hífens.' };
  }

  if (RESERVED_SLUGS.has(cleanSlug)) {
    return { isValid: false, message: 'Este apelido é reservado pelo sistema.' };
  }

  return { isValid: true, message: '' };
}

/**
 * Gera um slug alfanumérico aleatório de 6 a 8 caracteres
 */
export function generateRandomSlug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 3) + 6; // 6, 7 ou 8
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Gera um slug garantindo que ele não exista no banco de dados
 */
export async function generateUniqueSlug(): Promise<string> {
  let slug = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    slug = generateRandomSlug();
    const existing = await db.getLinkBySlug(slug);
    if (!existing) {
      exists = false;
    }
    attempts++;
  }

  return slug;
}

/**
 * Detecta o navegador a partir do userAgent
 */
export function detectBrowser(userAgent: string = navigator.userAgent): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('edg') && !ua.includes('opr')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opr') || ua.includes('opera')) return 'Opera';
  return 'Outro';
}

/**
 * Detecta o sistema operacional a partir do userAgent
 */
export function detectOS(userAgent: string = navigator.userAgent): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) return 'MacOS';
  if (ua.includes('linux') && !ua.includes('android')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Outro';
}

/**
 * Detecta o tipo de dispositivo a partir do userAgent
 */
export function detectDevice(userAgent: string = navigator.userAgent): string {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

/**
 * Detecta a origem da referência a partir da URL
 */
export function detectReferrer(referrerUrl: string = document.referrer): string {
  if (!referrerUrl) return 'Direto';
  try {
    const url = new URL(referrerUrl);
    const host = url.hostname.toLowerCase();
    
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('facebook.com') || host.includes('fb.me')) return 'Facebook';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('twitter.com') || host.includes('t.co') || host.includes('x.com')) return 'X / Twitter';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('t.me') || host.includes('telegram.org')) return 'Telegram';
    if (host.includes('whatsapp.com') || host.includes('wa.me')) return 'WhatsApp';
    
    return url.hostname;
  } catch (_) {
    return 'Outro';
  }
}

/**
 * Formata datas de maneira amigável em português
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
