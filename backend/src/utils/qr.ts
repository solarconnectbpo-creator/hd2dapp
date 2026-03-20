/**
 * QR code generation utility
 * Uses Google Charts API to generate QR codes
 */

export function generateQR(text: string): string {
  const url = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(text)}`;
  return url;
}
