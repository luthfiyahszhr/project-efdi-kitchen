declare global {
  interface Window {
    grecaptcha?: {
      render(
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        },
      ): number;
      reset(widgetId?: number): void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
const SCRIPT_ID = 'google-recaptcha-v2';
const API_TIMEOUT_MS = 15_000;

async function loadRecaptcha(): Promise<void> {
  if (typeof window.grecaptcha?.render === 'function') return;
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      const deadline = Date.now() + API_TIMEOUT_MS;
      const timeoutId = window.setTimeout(() => {
        script.remove();
        scriptPromise = null;
        reject(new Error('Google reCAPTCHA tidak merespons. Periksa koneksi atau pemblokir iklan.'));
      }, API_TIMEOUT_MS);
      script.onload = () => {
        const checkRender = () => {
          if (typeof window.grecaptcha?.render === 'function') {
            window.clearTimeout(timeoutId);
            resolve();
            return;
          }
          if (Date.now() >= deadline) {
            window.clearTimeout(timeoutId);
            scriptPromise = null;
            reject(new Error('Google reCAPTCHA tidak menyediakan widget v2. Pastikan jenis key adalah v2 Checkbox.'));
            return;
          }
          window.setTimeout(checkRender, 50);
        };
        checkRender();
      };
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        script.remove();
        scriptPromise = null;
        reject(new Error('Google reCAPTCHA tidak dapat dimuat. Periksa koneksi atau pemblokir iklan.'));
      };
      document.head.appendChild(script);
    });
  }
  await scriptPromise;
}

export async function renderRecaptcha(
  container: HTMLElement,
  onTokenChange: (token: string) => void,
  onError: (message: string) => void,
): Promise<{ reset: () => void; destroy: () => void }> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error('Site key CAPTCHA belum diisi di Frontend/.env.');
  }

  try {
    await loadRecaptcha();
    const captcha = window.grecaptcha;
    if (!captcha || typeof captcha.render !== 'function') {
      throw new Error('Google reCAPTCHA tidak menyediakan widget v2. Periksa key dan konfigurasi CAPTCHA.');
    }

    const widgetContainer = document.createElement('div');
    container.appendChild(widgetContainer);
    const widgetId = captcha.render(widgetContainer, {
      sitekey: siteKey,
      callback: onTokenChange,
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => {
        onTokenChange('');
        onError('Verifikasi CAPTCHA terganggu. Periksa koneksi internet lalu coba lagi.');
      },
    });

    return {
      reset: () => captcha.reset(widgetId),
      destroy: () => {
        captcha.reset(widgetId);
        widgetContainer.remove();
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/invalid site key/i.test(message)) {
      throw new Error(
        'Site key tidak cocok. Gunakan key reCAPTCHA v2 Checkbox dan daftarkan domain localhost.',
        { cause: error },
      );
    }
    if (message) throw error;
    throw new Error('CAPTCHA gagal dimuat. Periksa site key dan coba lagi.', { cause: error });
  }
}
