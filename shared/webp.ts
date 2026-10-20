// Canvas output may still include an ICC profile. Strip ancillary metadata;
// the canvas has already converted the image into its default sRGB colour space.
export function stripWebpMetadata(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    text = (offset: number) =>
      new TextDecoder().decode(bytes.subarray(offset, offset + 4));
  if (
    bytes.length < 20 ||
    text(0) !== "RIFF" ||
    text(8) !== "WEBP" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw new Error("Invalid WebP");
  const chunks: Uint8Array[] = [];
  let offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error("Invalid WebP");
    const size = view.getUint32(offset + 4, true),
      end = offset + 8 + size + (size % 2),
      kind = text(offset);
    if (end > bytes.length) throw new Error("Invalid WebP");
    if (!["ICCP", "EXIF", "XMP "].includes(kind)) {
      const chunk = bytes.slice(offset, end);
      if (kind === "VP8X") {
        if (size !== 10) throw new Error("Invalid WebP");
        chunk[8] &= ~(0x20 | 0x08 | 0x04);
      }
      chunks.push(chunk);
    }
    offset = end;
  }
  const out = new Uint8Array(12 + chunks.reduce((n, c) => n + c.length, 0));
  out.set(bytes.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  offset = 12;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
