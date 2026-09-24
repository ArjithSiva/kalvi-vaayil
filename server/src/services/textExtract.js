import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract text from a PDF buffer.
 */
export async function extractFromPDF(buffer) {
  try {
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (err) {
    console.error('PDF extraction error:', err.message);
    return '';
  }
}

/**
 * Extract text from a DOCX buffer.
 */
export async function extractFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err) {
    console.error('DOCX extraction error:', err.message);
    return '';
  }
}

/**
 * Extract text based on file type.
 */
export async function extractText(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    return extractFromPDF(buffer);
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return extractFromDOCX(buffer);
  }
  return '';
}

export default { extractFromPDF, extractFromDOCX, extractText };
