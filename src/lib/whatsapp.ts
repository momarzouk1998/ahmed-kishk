/**
 * Utility function to send formatted receipts & quotes via WhatsApp reliably
 */
export function sendWhatsAppMessage(phone: string, text: string) {
  try {
    // 1. Sanitize phone number (remove spaces, dashes, +, non-digit characters)
    let cleanPhone = phone.replace(/\D/g, '');

    // 2. Add Egyptian country code 20 if local Egyptian number (starts with 01...)
    if (cleanPhone.startsWith('01')) {
      cleanPhone = `2${cleanPhone}`;
    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10 && cleanPhone.startsWith('1')) {
      cleanPhone = `20${cleanPhone}`;
    }

    // 3. Encode text parameter safely
    const encodedText = encodeURIComponent(text);

    // 4. Construct universal WhatsApp URL (works on mobile app & desktop browser)
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    // 5. Open in new browser tab
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('Failed to open WhatsApp URL:', err);
    alert('حدث خطأ أثناء الاتصال بواتساب، يرجى التأكد من صحة رقم الهاتف.');
  }
}
