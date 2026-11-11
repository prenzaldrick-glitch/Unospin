/**
 * Official Monetag Integration Engine
 * Connects the official Monetag Service Worker & Zone Ad Tag.
 * 
 * Official Configuration:
 * 1. Monetag In-Page / OnClick Ad Tag:
 *    - Zone ID: 12238222
 *    - Script URL: https://al5sm.com/tag.min.js
 * 
 * 2. Monetag Service Worker:
 *    - Domain: 5gvci.com
 *    - Zone ID: 12208588
 *    - Service Worker URL: https://5gvci.com/act/files/service-worker.min.js?r=sw
 *    - Scope: /
 */

import { MonetagConfig } from '../types';

export const MONETAG_TAG_ZONE_ID = '12238222';
export const MONETAG_TAG_SRC = 'https://al5sm.com/tag.min.js';

export const MONETAG_DOMAIN = '5gvci.com';
export const MONETAG_SW_ZONE_ID = 12208588;
export const MONETAG_ZONE_ID = 12208588;
export const MONETAG_SW_REMOTE_URL = 'https://5gvci.com/act/files/service-worker.min.js?r=sw';
export const MONETAG_SW_PATH = '/sw.js';

let isRegistrationInProgress = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let lastAdTriggerTimestamp = 0;

export const DEFAULT_MONETAG_CONFIG: MonetagConfig = {
  domain: MONETAG_DOMAIN,
  swZoneId: MONETAG_SW_ZONE_ID,
  tagZoneId: MONETAG_TAG_ZONE_ID,
  tagSrc: MONETAG_TAG_SRC,
  serviceWorkerUrl: MONETAG_SW_REMOTE_URL,
  isRegistered: false,
  registrationScope: '/',
  isTagLoaded: false,
};

/**
 * Checks if the Monetag tag script for Zone 12238222 is present in the document.
 */
export function isMonetagTagLoaded(): boolean {
  if (typeof document === 'undefined') return false;
  const existing = document.querySelector(`script[data-zone="${MONETAG_TAG_ZONE_ID}"]`) ||
                   document.querySelector(`script[src="${MONETAG_TAG_SRC}"]`);
  return !!existing;
}

/**
 * Injects the official Monetag ad code for Zone 12238222:
 * (function(s){
 *   s.dataset.zone='12238222',
 *   s.src='https://al5sm.com/tag.min.js'
 * })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
 * 
 * RULES:
 * - Only called when entering the Offers & Tasks section.
 * - Prevents duplicate script elements.
 */
export function injectMonetagTagScript(): boolean {
  if (typeof document === 'undefined') return false;

  // Prevent duplicate script injection
  if (isMonetagTagLoaded()) {
    return true;
  }

  try {
    const script = document.createElement('script');
    script.dataset.zone = MONETAG_TAG_ZONE_ID;
    script.src = MONETAG_TAG_SRC;
    script.async = true;

    const target = [document.documentElement, document.body].filter(Boolean).pop();
    if (target) {
      target.appendChild(script);
      console.log(`[Monetag] Tag script injected for Zone ${MONETAG_TAG_ZONE_ID}`);
      return true;
    }
  } catch (err) {
    console.warn('[Monetag] Error injecting ad tag script:', err);
  }

  return false;
}

/**
 * Trigger Monetag ad for Zone 12238222 with ONE CLICK:
 * - Immediately triggers the ad on user interaction
 * - Invokes window.show_12238222() if exposed by the Monetag tag
 * - Debounces rapid double-clicks
 * - Returns a Promise resolving when ad invocation is complete
 */
export async function triggerMonetagAd(): Promise<{
  triggered: boolean;
  type: 'callback_promise' | 'function_call' | 'tag_invoked';
  message: string;
}> {
  if (typeof window === 'undefined') {
    return { triggered: false, type: 'tag_invoked', message: 'Window not defined' };
  }

  // Prevent double-click spam
  const now = Date.now();
  if (now - lastAdTriggerTimestamp < 800) {
    return { triggered: false, type: 'tag_invoked', message: 'Debounced click' };
  }
  lastAdTriggerTimestamp = now;

  // Ensure script is injected inside Offers
  injectMonetagTagScript();

  // Check if Monetag global zone handler is available (standard Monetag show function)
  const win = window as any;
  const showFn = win[`show_${MONETAG_TAG_ZONE_ID}`] || win.show_12238222 || win.show_tag;

  if (typeof showFn === 'function') {
    try {
      const maybePromise = showFn();
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
        return {
          triggered: true,
          type: 'callback_promise',
          message: `Monetag Zone ${MONETAG_TAG_ZONE_ID} ad completed via callback`,
        };
      }
      return {
        triggered: true,
        type: 'function_call',
        message: `Monetag Zone ${MONETAG_TAG_ZONE_ID} ad triggered directly`,
      };
    } catch (err) {
      console.warn('[Monetag] Notice invoking show function:', err);
    }
  }

  return {
    triggered: true,
    type: 'tag_invoked',
    message: `Monetag Zone ${MONETAG_TAG_ZONE_ID} tag invoked for ad presentation`,
  };
}

/**
 * Registers the official Monetag service worker ('/sw.js') with root scope ('/').
 * - Strictly prevents duplicate registrations
 * - Compatible with HTTPS hosting (Netlify, Cloudflare Pages, Firebase Hosting) and localhost
 */
export async function registerMonetagServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // Ensure secure context (HTTPS or localhost)
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.endsWith('.localhost');
  const isSecure = window.location.protocol === 'https:' || isLocalhost;

  if (!isSecure) {
    console.warn('[Monetag] Service workers require a secure HTTPS context or localhost.');
    return null;
  }

  if (isRegistrationInProgress) {
    return serviceWorkerRegistration;
  }

  try {
    isRegistrationInProgress = true;

    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    if (existingRegistration && existingRegistration.active) {
      serviceWorkerRegistration = existingRegistration;
      return existingRegistration;
    }

    const registration = await navigator.serviceWorker.register(MONETAG_SW_PATH, {
      scope: '/',
    });

    serviceWorkerRegistration = registration;
    console.log('[Monetag] Official Service Worker registered successfully with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('[Monetag] Service Worker registration failed:', error);
    return null;
  } finally {
    isRegistrationInProgress = false;
  }
}

/**
 * Checks if the official Monetag service worker is registered and active
 */
export async function checkMonetagServiceWorkerStatus(): Promise<{
  isSupported: boolean;
  isRegistered: boolean;
  scope: string | null;
  state: string | null;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { isSupported: false, isRegistered: false, scope: null, state: null };
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      const activeWorker = reg.active || reg.installing || reg.waiting;
      return {
        isSupported: true,
        isRegistered: true,
        scope: reg.scope,
        state: activeWorker ? activeWorker.state : 'active',
      };
    }
  } catch (e) {
    console.warn('[Monetag] Error checking SW status:', e);
  }

  return { isSupported: true, isRegistered: false, scope: null, state: null };
}
