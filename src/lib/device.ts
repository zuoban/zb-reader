const DEVICE_ID_KEY = 'zb_reader_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    const platform = getPlatform();
    deviceId = `${platform}-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Server';
  }

  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return 'Mac';
  if (/Win32|Win64|Windows|WinCE/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Unknown Device';
}

function getPlatform(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const ua = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return 'mac';
  if (/Win32|Win64|Windows|WinCE/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  
  return 'unknown';
}

export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}
