import { useState } from 'react';

const toastQueue = [];
let visibleToasts = 0;
const MAX_VISIBLE = 3;

function showToast({ title, description, variant = 'default', duration = 4000 }) {
  const id = crypto.randomUUID();
  const toast = { id, title, description, variant, duration, createdAt: Date.now() };
  toastQueue.push(toast);
  processQueue();
  return id;
}

function processQueue() {
  if (visibleToasts >= MAX_VISIBLE) return;
  const toast = toastQueue.find((t) => !t.shown);
  if (!toast) return;
  toast.shown = true;
  visibleToasts++;
  setTimeout(() => {
    toast.hidden = true;
    visibleToasts--;
    setTimeout(() => {
      const idx = toastQueue.indexOf(toast);
      if (idx > -1) toastQueue.splice(idx, 1);
      visibleToasts--;
      processQueue();
    }, 100);
  }, toast.duration);
}

const toast = {
  success: (opts) => showToast({ ...opts, variant: 'success' }),
  error: (opts) => showToast({ ...opts, variant: 'error' }),
  warning: (opts) => showToast({ ...opts, variant: 'warning' }),
};

export { toast };