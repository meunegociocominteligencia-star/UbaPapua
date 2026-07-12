/**
 * Utility to resolve API URLs dynamically.
 * Helps the app communicate with the hosted server when running inside a compiled APK (Capacitor).
 */
export function getApiUrl(path: string): string {
  if (typeof window === 'undefined') return path;

  // Detect if running inside a native mobile app wrapper (Capacitor/Cordova)
  const isNative = 
    (typeof window !== 'undefined' && (window as any).Capacitor) ||
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'file:' || 
    ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.hostname === 'localhost' && !window.location.port);

  if (isNative) {
    // If running in APK, route requests to the hosted web server
    const baseUrl = (import.meta as any).env.VITE_API_URL || 'https://ais-pre-qbyy2na74rv3l2g37lryrb-559951806594.us-east1.run.app';
    
    // Ensure clean slash joining
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  // Otherwise, use relative path (works natively in all browser stages)
  return path;
}
