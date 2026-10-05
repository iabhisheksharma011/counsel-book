/* CounselBook - encrypted local storage
 * All student data is encrypted with AES-256-GCM using a random data key (DEK).
 * The DEK is wrapped separately for each user with a key derived from their
 * password (PBKDF2-SHA256), plus once with the admin recovery key.
 * Everything is stored in the browser's IndexedDB on this computer only.
 */
(function () {
  'use strict';
  const DB_NAME = 'counselbook';
  const DB_VER = 1;
  const ITER = 200000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // ---------- encoding helpers ----------
  function b64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function unb64(str) {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  function uid() {
    return Date.now().toString(36) + Array.from(rand(5), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 7);
  }

  // ---------- IndexedDB ----------
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Storage aborted'));
    });
  }
  const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
  const kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
  const fileGet = (k) => tx('files', 'readonly', (s) => s.get(k));
  const fileSet = (k, v) => tx('files', 'readwrite', (s) => s.put(v, k));
  const fileDel = (k) => tx('files', 'readwrite', (s) => s.delete(k));
  async function fileAll() {
    const d = await db();
    return new Promise((resolve, reject) => {
      const out = [];
      const t = d.transaction('files', 'readonly');
      const req = t.objectStore('files').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out.push({ id: c.key, rec: c.value }); c.continue(); }
      };
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
    });
  }
  async function clearAll() {
    await tx('kv', 'readwrite', (s) => s.clear());
    await tx('files', 'readwrite', (s) => s.clear());
  }

  // ---------- crypto ----------
  async function deriveKEK(secret, salt, iter) {
    const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
  }
  async function newDEK() {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function wrapDEK(dek, secret) {
    const salt = rand(16), iv = rand(12);
    const kek = await deriveKEK(secret, salt, ITER);
    const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv });
    return { salt: b64(salt), iv: b64(iv), iter: ITER, wrapped: b64(wrapped) };
  }
  async function unwrapDEK(rec, secret) {
    const kek = await deriveKEK(secret, unb64(rec.salt), rec.iter || ITER);
    return crypto.subtle.unwrapKey('raw', unb64(rec.wrapped), kek, { name: 'AES-GCM', iv: unb64(rec.iv) },
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function encryptBytes(dek, bytes) {
    const iv = rand(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, bytes);
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decryptBytes(dek, rec) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, dek, unb64(rec.ct));
  }
  const encryptJSON = (dek, obj) => encryptBytes(dek, enc.encode(JSON.stringify(obj)));
  async function decryptJSON(dek, rec) {
    return JSON.parse(dec.decode(await decryptBytes(dek, rec)));
  }
  function makeRecoveryKey() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = rand(20);
    let s = '';
    for (let i = 0; i < 20; i++) { s += A[bytes[i] % A.length]; if (i % 5 === 4 && i < 19) s += '-'; }
    return s;
  }
  const normRecovery = (k) => (k || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-');

  window.Store = {
    uid, b64, unb64,
    kvGet, kvSet, fileGet, fileSet, fileDel, fileAll, clearAll,
    newDEK, wrapDEK, unwrapDEK, encryptBytes, decryptBytes, encryptJSON, decryptJSON,
    makeRecoveryKey, normRecovery,
  };
})();
