import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

const SERVER_PORT = 3000;
const CACHE_KEY = 'discovered_server_url';
const HEALTH_ENDPOINT = '/version';
const FALLBACK_URL = `http://192.168.1.128:${SERVER_PORT}`;

let cachedUrl: string | null = null;
let discoveryInProgress: Promise<string> | null = null;

function probeHost(ip: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, timeoutMs);

    fetch(`http://${ip}:${port}${HEALTH_ENDPOINT}`, {
      method: 'GET',
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timer);
        resolve(res.ok);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

async function getDeviceIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    console.log(`[Discovery] Device IP: ${ip}`);
    return ip || null;
  } catch (e) {
    console.log(`[Discovery] getDeviceIp failed: ${e}`);
    return null;
  }
}

function getSubnetPrefix(ip: string): string | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return parts.slice(0, 3).join('.');
}

export async function discoverServer(): Promise<string> {
  if (discoveryInProgress) return discoveryInProgress;

  discoveryInProgress = doDiscover();
  try {
    return await discoveryInProgress;
  } finally {
    discoveryInProgress = null;
  }
}

async function doDiscover(): Promise<string> {
  if (cachedUrl) {
    console.log(`[Discovery] Checking cached: ${cachedUrl}`);
    const alive = await probeFullUrl(cachedUrl);
    if (alive) {
      console.log(`[Discovery] Cached URL alive: ${cachedUrl}`);
      return cachedUrl;
    }
    console.log(`[Discovery] Cached URL dead, clearing`);
    cachedUrl = null;
  }

  const saved = await SecureStore.getItemAsync(CACHE_KEY);
  if (saved) {
    console.log(`[Discovery] Checking saved: ${saved}`);
    const alive = await probeFullUrl(saved);
    if (alive) {
      cachedUrl = saved;
      console.log(`[Discovery] Saved URL alive: ${saved}`);
      return saved;
    }
  }

  const deviceIp = await getDeviceIp();
  const prefix = deviceIp ? getSubnetPrefix(deviceIp) : null;

  const candidates: string[] = [];
  if (prefix) {
    candidates.push(
      `${prefix}.1`,
      `${prefix}.128`,
      `${prefix}.131`,
      `${prefix}.100`,
      `${prefix}.254`,
    );
  }
  candidates.push(
    '192.168.1.128',
    '192.168.1.131',
    '192.168.1.1',
    '192.168.0.128',
    '192.168.0.1',
    '10.0.0.1',
  );

  const unique = [...new Set(candidates)];
  console.log(`[Discovery] Probing ${unique.length} candidates: ${unique.join(', ')}`);

  const results = await Promise.allSettled(
    unique.map((ip) => probeHost(ip, SERVER_PORT, 1000))
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value) {
      const found = `http://${unique[i]}:${SERVER_PORT}`;
      cachedUrl = found;
      await SecureStore.setItemAsync(CACHE_KEY, found);
      console.log(`[Discovery] Found server: ${found}`);
      return found;
    }
  }

  if (prefix) {
    console.log(`[Discovery] Quick candidates failed, scanning subnet ${prefix}.x ...`);
    const found = await scanSubnet(prefix);
    if (found) {
      cachedUrl = found;
      await SecureStore.setItemAsync(CACHE_KEY, found);
      console.log(`[Discovery] Subnet scan found: ${found}`);
      return found;
    }
  }

  const fallback = saved || FALLBACK_URL;
  console.log(`[Discovery] All failed, using fallback: ${fallback}`);
  cachedUrl = fallback;
  return fallback;
}

async function scanSubnet(prefix: string): Promise<string | null> {
  const BATCH_SIZE = 30;

  for (let i = 1; i <= 254; i += BATCH_SIZE) {
    const batch: string[] = [];
    for (let j = i; j < i + BATCH_SIZE && j <= 254; j++) {
      batch.push(`${prefix}.${j}`);
    }

    const results = await Promise.allSettled(
      batch.map((ip) => probeHost(ip, SERVER_PORT, 600))
    );

    for (let k = 0; k < results.length; k++) {
      const r = results[k];
      if (r.status === 'fulfilled' && r.value) {
        return `http://${batch[k]}:${SERVER_PORT}`;
      }
    }
  }

  return null;
}

async function probeFullUrl(url: string): Promise<boolean> {
  const host = url.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\/.*$/, '');
  return probeHost(host, SERVER_PORT, 1500);
}

export async function checkServerHealth(url: string): Promise<boolean> {
  return probeFullUrl(url);
}

export function getServerUrl(): string {
  return cachedUrl || FALLBACK_URL;
}

export function clearCache(): void {
  cachedUrl = null;
}
