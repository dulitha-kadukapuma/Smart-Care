import { NOTIFY_LK_CONFIG } from '../config/smsConfig';

/**
 * Format any Sri Lankan phone number to 947XXXXXXXX format required by Notify.lk
 * Examples:
 *   "0771234567"  -> "94771234567"
 *   "+94771234567" -> "94771234567"
 *   "771234567"   -> "94771234567"
 */
export function formatSriLankanPhone(phone) {
  if (!phone) return null;

  // Remove non-digit characters
  let cleaned = String(phone).replace(/\D/g, '');

  // If starts with 0094
  if (cleaned.startsWith('0094')) {
    cleaned = cleaned.substring(4);
  }
  // If starts with 94
  else if (cleaned.startsWith('94')) {
    cleaned = cleaned.substring(2);
  }
  // If starts with 0 (e.g., 071...)
  else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // A valid Sri Lankan mobile starts with 7 and has 9 digits
  if (cleaned.length === 9 && cleaned.startsWith('7')) {
    return `94${cleaned}`;
  }

  return null;
}

/**
 * Send an SMS via Notify.lk API
 * @param {Object} options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.message - Text message to send
 * @returns {Promise<{success: boolean, response?: any, error?: string}>}
 */
export async function sendSMS({ to, message }) {
  try {
    const formattedPhone = formatSriLankanPhone(to);
    if (!formattedPhone) {
      console.warn('[Notify.lk] Invalid phone number:', to);
      return { success: false, error: 'Invalid Sri Lankan phone number. Please enter a valid number (e.g. 0771234567).' };
    }

    if (!message || !message.trim()) {
      return { success: false, error: 'Message content cannot be empty.' };
    }

    // Prepare body
    const bodyParams = new URLSearchParams({
      user_id: NOTIFY_LK_CONFIG.USER_ID,
      api_key: NOTIFY_LK_CONFIG.API_KEY,
      sender_id: NOTIFY_LK_CONFIG.SENDER_ID,
      to: formattedPhone,
      message: message.trim(),
    });

    const response = await fetch(NOTIFY_LK_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.status === 'success') {
      console.log('[Notify.lk] SMS sent successfully:', formattedPhone);
      return { success: true, response: data };
    } else {
      console.warn('[Notify.lk] SMS send failed:', data);
      return {
        success: false,
        error: data?.message || data?.data || `HTTP error ${response.status}`,
        response: data,
      };
    }
  } catch (error) {
    console.error('[Notify.lk] Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS when patient successfully obtains a queue token
 */
export async function sendTokenConfirmationSMS({ phone, patientName, tokenNumber, doctorName, currentToken }) {
  const currentServingText = currentToken > 0 ? ` Now serving: #${currentToken}.` : '';
  const message = `SmartCare: Hello ${patientName}, your token is #${tokenNumber} for ${doctorName}.${currentServingText} Please arrive on time.`;
  return sendSMS({ to: phone, message });
}

/**
 * Send SMS when the doctor calls the patient's token ("Now Serving")
 */
export async function sendNowServingSMS({ phone, patientName, tokenNumber, doctorName, roomNo }) {
  const roomText = roomNo ? ` in ${roomNo}` : '';
  const message = `SmartCare Alert: Token #${tokenNumber} (${patientName}), it is your turn now! Please proceed to see ${doctorName}${roomText}.`;
  return sendSMS({ to: phone, message });
}

/**
 * Send SMS when the pharmacy marks the patient's medicines as ready
 */
export async function sendMedicineReadySMS({ phone, patientName }) {
  const message = `SmartCare Pharmacy: Hello ${patientName}, your prescribed medicines are ready for pickup at the Pharmacy counter.`;
  return sendSMS({ to: phone, message });
}
