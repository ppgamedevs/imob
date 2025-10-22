import sharp from "sharp";

/**
 * Computes a perceptual hash (pHash) using blockhash algorithm.
 * Creates 8×8 grayscale thumbnail, compares each pixel to average brightness,
 * and generates a 64-bit hash (16 hex chars).
 *
 * @param urlOrBuffer - Image URL string or Buffer
 * @returns 16-character hex string or null on error
 */
export async function phashHex(urlOrBuffer: string | Buffer): Promise<string | null> {
  try {
    let buffer: Buffer;

    if (typeof urlOrBuffer === "string") {
      // Fetch from URL
      const response = await fetch(urlOrBuffer);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = urlOrBuffer;
    }

    // Resize to 8×8 grayscale, extract raw pixel data
    const data = await sharp(buffer).grayscale().resize(8, 8, { fit: "fill" }).raw().toBuffer();

    const pixels = Array.from(data); // 64 values (0..255)
    const avg = pixels.reduce((sum, val) => sum + val, 0) / pixels.length;

    // Generate binary string: 1 if pixel >= avg, else 0
    let bits = "";
    for (const val of pixels) {
      bits += val >= avg ? "1" : "0";
    }

    // Convert to hex (4 bits per char)
    let hex = "";
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = bits.slice(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }

    return hex;
  } catch (err) {
    console.error("phashHex error:", err);
    return null;
  }
}

/**
 * Computes Hamming distance between two hex pHash strings.
 * Measures how many bits differ between the two hashes.
 *
 * @param a - First hex hash (16 chars)
 * @param b - Second hex hash (16 chars)
 * @returns Number of differing bits (0 = identical, 64 = completely different)
 */
export function hammingHex(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let distance = 0;

  // Popcount lookup table for nibbles (0-15)
  const popcount = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

  for (let i = 0; i < len; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += popcount[xor];
  }

  // Add penalty for length mismatch
  distance += Math.abs(a.length - b.length) * 4;

  return distance;
}
