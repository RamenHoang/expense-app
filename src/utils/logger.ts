const isDev = process.env.NODE_ENV !== 'production';

function timestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export const logger = {
  log: (message: string, ...args: unknown[]) => {
    if (isDev) console.log(`[${timestamp()}] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) console.warn(`[${timestamp()}] ⚠ ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[${timestamp()}] ✖ ${message}`, ...args);
  },
};
