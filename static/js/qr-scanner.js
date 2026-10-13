/**
 * SmartLib QR Scanner Helper Engine
 * Encapsulates HTML5-QRCode setup, normalization, and camera toggling
 */

class SmartLibQRScanner {
  constructor(containerId, onScanSuccess, onScanError) {
    this.containerId = containerId;
    this.onScanSuccess = onScanSuccess;
    this.onScanError = onScanError;
    this.scannerInstance = null;
    this.isScanning = false;
  }

  static normalize(raw) {
    if (!raw) return { raw: '', clean: '', isbn: '', bookId: null };
    const text = String(raw).trim();
    let bookId = null;
    let clean = text;

    const idMatch = text.match(/^(?:book[-\s]?id|id)\s*[:=]\s*(\d+)/i);
    if (idMatch) {
      bookId = parseInt(idMatch[1], 10);
      clean = idMatch[1];
    } else {
      clean = text.replace(/^(?:isbn|book)\s*[:=]\s*/i, '').trim();
      if (/^\d+$/.test(clean) && clean.length <= 4) {
        bookId = parseInt(clean, 10);
      }
    }

    const isbn = clean.replace(/[\s\-]/g, '').toUpperCase();
    return { raw: text, clean, isbn, bookId };
  }

  start() {
    if (typeof Html5Qrcode === 'undefined') {
      throw new Error("html5-qrcode library is not loaded.");
    }
    if (this.isScanning) return Promise.resolve();

    if (!this.scannerInstance) {
      this.scannerInstance = new Html5Qrcode(this.containerId);
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    return this.scannerInstance.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (this.onScanSuccess) this.onScanSuccess(decodedText);
      },
      (error) => {
        if (this.onScanError) this.onScanError(error);
      }
    ).then(() => {
      this.isScanning = true;
    });
  }

  stop() {
    if (this.scannerInstance && this.isScanning) {
      return this.scannerInstance.stop().then(() => {
        this.isScanning = false;
      });
    }
    return Promise.resolve();
  }
}
