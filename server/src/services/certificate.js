import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { getGridFSBucket } from '../config/db.js';
import Certificate from '../models/Certificate.js';
import { config } from '../config/env.js';

/**
 * Generate a certificate PDF with embedded QR code and store in GridFS.
 * @param {Object} certificate - Certificate document (populated with user + workshop)
 * @returns {Promise<mongoose.Types.ObjectId>} GridFS file ID
 */
export async function generateCertificatePDF(certificate) {
  const verifyUrl = `${config.clientUrl}/verify/${certificate.certificateId}`;

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const bucket = getGridFSBucket();

      const uploadStream = bucket.openUploadStream(
        `certificate-${certificate.certificateId}.pdf`,
        { contentType: 'application/pdf' }
      );

      uploadStream.on('finish', () => resolve(uploadStream.id));
      uploadStream.on('error', reject);
      uploadStream.end(buffer);
    });

    doc.on('error', reject);

    // Certificate content
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    // Border
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60).stroke('#1a237e');
    doc.rect(35, 35, pageWidth - 70, pageHeight - 70).stroke('#3949ab');

    // Title
    doc.fontSize(36).fillColor('#1a237e').font('Helvetica-Bold');
    doc.text('Certificate of Completion', centerX - 200, 80, { width: 400, align: 'center' });

    // Subtitle
    doc.fontSize(14).fillColor('#666666').font('Helvetica');
    doc.text('Kalvi Vaayil / கல்வி வாயில்', centerX - 200, 130, { width: 400, align: 'center' });

    // Body
    doc.fontSize(16).fillColor('#333333');
    doc.text('This is to certify that', centerX - 200, 200, { width: 400, align: 'center' });

    // Participant name
    doc.fontSize(28).fillColor('#1a237e').font('Helvetica-Bold');
    doc.text(certificate.user?.name || 'Participant', centerX - 200, 240, { width: 400, align: 'center' });

    // Workshop
    doc.fontSize(16).fillColor('#333333').font('Helvetica');
    doc.text('has successfully completed the workshop', centerX - 200, 290, { width: 400, align: 'center' });

    doc.fontSize(22).fillColor('#1a237e').font('Helvetica-Bold');
    doc.text(certificate.workshop?.title || 'Workshop', centerX - 200, 320, { width: 400, align: 'center' });

    // Date
    doc.fontSize(14).fillColor('#666666').font('Helvetica');
    const dateStr = certificate.issuedAt
      ? new Date(certificate.issuedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Issued on ${dateStr}`, centerX - 200, 370, { width: 400, align: 'center' });

    // Certificate ID
    doc.fontSize(10).fillColor('#999999');
    doc.text(`Certificate ID: ${certificate.certificateId}`, centerX - 200, 410, { width: 400, align: 'center' });

    // QR Code
    doc.image(qrDataUrl, pageWidth - 180, pageHeight - 180, { width: 120 });

    // Scan text
    doc.fontSize(8).fillColor('#999999');
    doc.text('Scan to verify', pageWidth - 180, pageHeight - 55, { width: 120, align: 'center' });

    doc.end();
  });
}

export default { generateCertificatePDF };
