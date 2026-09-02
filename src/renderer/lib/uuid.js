// Pure-JS implementation of the Minecraft offline UUID derivation.
// Minecraft computes an offline-mode player's UUID as:
//   UUID v3 of namespace "OfflinePlayer:<nickname>" using MD5.
// (Technically Minecraft uses Java's UUID.nameUUIDFromBytes which does not
// XOR a namespace into the input — it just MD5s the raw UTF-8 bytes of the
// string "OfflinePlayer:<nickname>" and sets the version/variant bits.)

function md5(input) {
  // Minimal MD5 implementation. Operates on a Uint8Array, returns 16 bytes.
  const bytes = typeof input === 'string' ? utf8(input) : input;
  // Pre-processing: pad message
  const ml = bytes.length;
  const withOne = new Uint8Array(ml + 1);
  withOne.set(bytes);
  withOne[ml] = 0x80;
  let padLen = withOne.length;
  while (padLen % 64 !== 56) padLen++;
  const padded = new Uint8Array(padLen + 8);
  padded.set(withOne);
  // append length in bits, little-endian
  const bitLen = ml * 8;
  const lo = bitLen >>> 0;
  const hi = Math.floor(bitLen / 0x100000000) >>> 0;
  writeUint32LE(padded, padLen, lo);
  writeUint32LE(padded, padLen + 4, hi);

  // Constants
  const K = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ]);
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let off = 0; off < padded.length; off += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) {
      M[i] = readUint32LE(padded, off + i * 4);
    }
    let A = a0,
      B = b0,
      C = c0,
      D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const temp = D;
      D = C;
      C = B;
      const sum = (A + F + K[i] + M[g]) >>> 0;
      B = (B + leftRotate(sum, S[i])) >>> 0;
      A = temp;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  writeUint32LE(out, 0, a0);
  writeUint32LE(out, 4, b0);
  writeUint32LE(out, 8, c0);
  writeUint32LE(out, 12, d0);
  return out;
}

function leftRotate(x, c) {
  return ((x << c) | (x >>> (32 - c))) >>> 0;
}
function readUint32LE(buf, o) {
  return (
    (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0
  );
}
function writeUint32LE(buf, o, v) {
  buf[o] = v & 0xff;
  buf[o + 1] = (v >>> 8) & 0xff;
  buf[o + 2] = (v >>> 16) & 0xff;
  buf[o + 3] = (v >>> 24) & 0xff;
}
function utf8(str) {
  return new TextEncoder().encode(str);
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Returns the offline Minecraft UUID for the given nickname, formatted with
 * dashes (e.g. "abcd1234-...").
 */
export function offlineUuid(nickname) {
  const bytes = md5('OfflinePlayer:' + (nickname || ''));
  // Set version (3) and variant (RFC 4122 / DCE 1.1)
  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
