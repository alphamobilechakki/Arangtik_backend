const fs = require('fs');
const {
  API24_BASE_URL,
  API24_API_KEY,
  API24_API_SECRET,
  API24_CHANNEL_ID,
  API24_LAUNDRY_TEMPLATE,
  API24_LAUNDRY_TEMPLATE_REG,
  API24_LAUNDRY_TEMPLATE_UNREG,
  API24_LANGUAGE,
  OTP_DEV_MODE,
} = require('../../config/env.config');
const { formatPhoneNumber } = require('../../utils/whatsapp.service');

class LaundryWhatsappService {
  /**
   * Helper to ensure the PDF URL is publicly downloadable by Meta
   * If running locally and remote server returns 404, mirrors the local file to a fast CDN
   */
  async ensurePublicPdfUrl(pdfUrl, pdfPath) {
    if (!pdfUrl) return null;

    // If running in development / local domain, immediately mirror to CDN for Meta
    const isLocalOrUnresolved =
      pdfUrl.includes('localhost') ||
      pdfUrl.includes('127.0.0.1') ||
      pdfUrl.includes('api.arangtik.com');

    if (!isLocalOrUnresolved) {
      try {
        const check = await fetch(pdfUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2000),
        }).catch(() => null);
        if (check && check.status === 200 && check.headers.get('content-type')?.includes('pdf')) {
          return pdfUrl;
        }
      } catch (_) {}
    }

    // If local file exists, mirror to high-speed raw stream so Meta can download authentic application/pdf
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        const fileBuffer = fs.readFileSync(pdfPath);
        const filename = pdfPath.split(/[/\\]/).pop() || 'WorkOrder.pdf';
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        const formData = new globalThis.FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', blob, filename);

        const res = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(15000),
        });
        const directUrl = (await res.text()).trim();
        if (directUrl && directUrl.startsWith('http')) {
          console.log(`[Laundry WhatsApp]: Public PDF mirror created for Meta: ${directUrl}`);
          return directUrl;
        }
      } catch (err) {
        console.warn(`[Laundry WhatsApp]: Temporary CDN mirror failed: ${err.message}`);
      }
    }

    return pdfUrl;
  }

  /**
   * Helper to format date in clean readable string
   */
  formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Send WhatsApp Laundry Work Order with PDF to Vendor via API24
   * Uses separate templates for registered vs unregistered vendors.
   * @param {Object} order LaundryOrder document
   * @param {string} pdfUrl Publicly accessible URL of the generated PDF
   */
  async sendWorkOrderToVendor(order, pdfUrl) {
    const formattedPhone = formatPhoneNumber(order.vendorPhone);

    if (!formattedPhone || formattedPhone.length < 10) {
      console.warn(`[Laundry WhatsApp]: Invalid vendor phone number: ${order.vendorPhone}`);
      return {
        sent: false,
        error: 'Invalid vendor phone number format',
        mode: 'error',
      };
    }

    // Select template dynamically based on vendor registration status
    const isRegistered = Boolean(order.isRegisteredVendor);
    const templateName = isRegistered
      ? (API24_LAUNDRY_TEMPLATE_REG || API24_LAUNDRY_TEMPLATE || 'vendors_order_registereds')
      : (API24_LAUNDRY_TEMPLATE_UNREG || 'vendors_order_unregistereds');

    const pickupDateStr = this.formatDate(order.pickupDate);
    const deliveryDateStr = this.formatDate(order.expectedDeliveryDate);
    const totalItemsStr = String(order.totalItems || (order.items && order.items.length) || 1);

    // If in Dev Mode or missing credentials, log and return simulated response
    if (OTP_DEV_MODE || !API24_API_KEY || !API24_API_SECRET || !API24_CHANNEL_ID) {
      const mode = OTP_DEV_MODE ? 'dev' : 'simulated';
      console.log(`[${mode.toUpperCase()} MODE] WhatsApp Work Order to ${isRegistered ? 'REGISTERED' : 'UNREGISTERED'} Vendor (${formattedPhone}):`);
      console.log(`- Selected Template: ${templateName}`);
      console.log(`- Vendor: ${order.vendorName}`);
      console.log(`- Customer: ${order.userName} (${order.userPhone})`);
      console.log(`- Pickup Date: ${pickupDateStr}`);
      console.log(`- Expected Delivery: ${deliveryDateStr}`);
      console.log(`- Total Items: ${totalItemsStr}`);
      console.log(`- PDF URL: ${pdfUrl}`);

      return {
        sent: true,
        mode,
        templateUsed: templateName,
        messageId: `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        formattedPhone,
      };
    }

    try {
      const baseUrl = API24_BASE_URL.replace(/\/+$/, '');
      const url = `${baseUrl}/messages/template`;

      // Both vendors_order_registered and vendors_order_unregistered are APPROVED with DOCUMENT header
      const components = [];

      const accessiblePdfUrl = await this.ensurePublicPdfUrl(pdfUrl, order.pdfPath);

      if (accessiblePdfUrl) {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: accessiblePdfUrl,
                filename: `WorkOrder_${order.orderNumber}.pdf`,
              },
            },
          ],
        });
      }

      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: String(order.vendorName || 'Partner') }, // {{1}} Vendor Name
          { type: 'text', text: String(order.userName || 'Customer') }, // {{2}} Customer Name
          { type: 'text', text: String(order.userPhone || '') }, // {{3}} Customer Phone
          { type: 'text', text: pickupDateStr }, // {{4}} Pickup Date
          { type: 'text', text: deliveryDateStr }, // {{5}} Expected Delivery Date
          { type: 'text', text: totalItemsStr }, // {{6}} Total Items Count
          { type: 'text', text: String(order.orderNumber) }, // {{7}} Work Order Number
        ],
      });

      const payload = {
        to: formattedPhone,
        templateName,
        language: API24_LANGUAGE || 'en_US',
        components,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-Key': API24_API_KEY,
          'X-API-Secret': API24_API_SECRET,
          'X-Channel-Id': API24_CHANNEL_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok || !responseData.success) {
        console.error('[API24 Laundry WhatsApp Error Response]:', responseData);
        return {
          sent: false,
          templateUsed: templateName,
          error: responseData.error || responseData.message || `API24 returned status ${response.status}`,
          mode: 'live_failed',
        };
      }

      return {
        sent: true,
        mode: 'live',
        templateUsed: templateName,
        messageId: responseData.data?.messageId || responseData.data?.id || `api24_${Date.now()}`,
        formattedPhone,
      };
    } catch (error) {
      console.error('[API24 Laundry WhatsApp Request Exception]:', error.message);
      return {
        sent: false,
        templateUsed: templateName,
        error: error.message,
        mode: 'exception',
      };
    }
  }
}

module.exports = new LaundryWhatsappService();
