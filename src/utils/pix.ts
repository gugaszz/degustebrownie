import QRCode from 'qrcode';

/**
 * Computes CRC16 CCITT for standard EMVCo BR Code
 */
function computeCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats standard TLV (Type-Length-Value)
 */
function formatTLV(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid?: string;
  description?: string;
}

export interface PixStaticPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  txid?: string;
}

/**
 * Cleans string removing accents and special symbols for EMVCo
 */
function normalizeString(str: string, maxLen: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, maxLen)
    .toUpperCase();
}

/**
 * Generates the official Pix Copy-and-Paste (BR Code) payload string
 */
export function generatePixPayload(params: PixPayloadParams): string {
  const {
    pixKey,
    merchantName = 'BROWNIE CONTROL',
    merchantCity = 'FORTALEZA',
    amount,
    txid = 'BROWNIE' + Date.now().toString().slice(-6)
  } = params;

  const cleanKey = pixKey.trim();
  const cleanName = normalizeString(merchantName, 25) || 'BROWNIE CONTROL';
  const cleanCity = normalizeString(merchantCity, 15) || 'FORTALEZA';
  const cleanTxid = txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  // 00: Payload Format Indicator
  let payload = formatTLV('00', '01');

  // 01: Point of Initiation Method — 12 = dynamic (has a fixed amount),
  // 11 = static (payer can still type/change the amount). Several banking
  // apps reject a BR Code that omits this field, so it's not optional in practice.
  payload += formatTLV('01', amount > 0 ? '12' : '11');

  // 26: Merchant Account Information
  // Sub-tags: 00 (GUI: br.gov.bcb.pix), 01 (Key)
  const gui = formatTLV('00', 'br.gov.bcb.pix');
  const keyTag = formatTLV('01', cleanKey);
  const merchantAccountInfo = `${gui}${keyTag}`;
  payload += formatTLV('26', merchantAccountInfo);

  // 52: Merchant Category Code (0000 = standard)
  payload += formatTLV('52', '0000');

  // 53: Transaction Currency (986 = Real / BRL)
  payload += formatTLV('53', '986');

  // 54: Transaction Amount
  if (amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTLV('54', formattedAmount);
  }

  // 58: Country Code (BR)
  payload += formatTLV('58', 'BR');

  // 59: Merchant Name
  payload += formatTLV('59', cleanName);

  // 60: Merchant City
  payload += formatTLV('60', cleanCity);

  // 62: Additional Data Field Template (05 = Reference Label / TXID)
  const txidTag = formatTLV('05', cleanTxid);
  payload += formatTLV('62', txidTag);

  // 63: CRC16 prefix
  const payloadWithoutCRC = `${payload}6304`;
  const crc = computeCRC16(payloadWithoutCRC);

  return `${payloadWithoutCRC}${crc}`;
}

/**
 * Generates a static Pix Copy-and-Paste code: same key/merchant info as the
 * dynamic one, but with no amount embedded — the payer types the value shown
 * on screen manually in their banking app. Use this when the payer's bank
 * rejects the dynamic (amount-embedded) code generated above.
 */
export function generateStaticPixPayload(params: PixStaticPayloadParams): string {
  return generatePixPayload({ ...params, amount: 0 });
}

/**
 * Generates base64 QR Code image from text payload
 */
export async function generateQrCodeDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#111111',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generating QR code', err);
    return '';
  }
}

/**
 * Currency formatter (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

/**
 * Date and time formatter (pt-BR)
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return isoString;
  }
}
