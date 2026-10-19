const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const { BASE_URL } = require('../../../config/env.config');
const { formatUploadUrl } = require('../../../utils/url.util');

class LaundryPdfService {
  constructor() {
    this.outputDir = path.resolve(process.cwd(), 'uploads/work-orders');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Helper to format date in clean readable string (e.g. 15 Oct 2026)
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
   * Helper to resolve local filesystem path from an image URL or path
   */
  resolveLocalImagePath(imageUrl) {
    if (!imageUrl) return null;
    try {
      let relativePath = imageUrl;
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const urlObj = new URL(imageUrl);
        relativePath = urlObj.pathname;
      }
      // Remove leading slash or /uploads/ or /api/uploads/
      relativePath = relativePath.replace(/^\/?(api\/)?uploads\//, '');
      const fullPath = path.resolve(process.cwd(), 'uploads', relativePath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return fullPath;
      }
    } catch {
      // Ignore URL parsing errors
    }
    return null;
  }

  /**
   * Helper to load and convert any image format (WEBP, PNG, etc.) to a PDFKit-compatible JPEG buffer
   */
  async getGarmentImageBuffer(imageUrl) {
    if (!imageUrl) return null;
    try {
      let imageBuffer = null;
      const localPath = this.resolveLocalImagePath(imageUrl);

      if (localPath && fs.existsSync(localPath)) {
        imageBuffer = await fs.promises.readFile(localPath);
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const fetchRes = await fetch(imageUrl, { timeout: 8000 }).catch(() => null);
        if (fetchRes && fetchRes.ok) {
          const arrayBuffer = await fetchRes.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
      }

      if (!imageBuffer) return null;

      // Resize and convert to optimized JPEG buffer for fast transmission and crisp rendering
      const jpegBuffer = await sharp(imageBuffer)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      return jpegBuffer;
    } catch (err) {
      console.warn(`[Laundry PDF]: Image conversion error for ${imageUrl}: ${err.message}`);
      return null;
    }
  }

  /**
   * Generate Work Order PDF:
   * - PAGE 1: Order Summary, Customer, Vendor, Schedule & Master Garment Checklist
   * - PAGE 2+: Dedicated Single Full Page for EACH selected garment (Large Photo + Metadata)
   *
   * @param {Object} order Order document
   * @returns {Promise<{ filePath: string, fileUrl: string, totalPages: number }>}
   */
  async generateWorkOrderPdf(order) {
    const filename = `${order.orderNumber}.pdf`;
    const filePath = path.join(this.outputDir, filename);

    // Pre-load and convert all garment images into JPEG buffers (converts WEBP for PDFKit)
    const imageBuffers = await Promise.all(
      (order.items || []).map((item) => this.getGarmentImageBuffer(item.imageUrl))
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        autoFirstPage: true,
        info: {
          Title: `Laundry Work Order - ${order.orderNumber}`,
          Author: 'Arangtik AI Wardrobe',
          Subject: 'Laundry Work Order & Dedicated Garment Catalog',
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Theme Colors
      const primaryColor = '#4338CA'; // Indigo 700
      const primaryDark = '#312E81'; // Indigo 900
      const darkColor = '#0F172A'; // Slate 900
      const mutedColor = '#64748B'; // Slate 500
      const lightBg = '#F8FAFC'; // Slate 50
      const borderColor = '#CBD5E1'; // Slate 300
      const cardBorder = '#E2E8F0'; // Slate 200

      const totalItems = (order.items && order.items.length) || 0;
      const totalPages = 1 + totalItems; // Page 1 = Summary, Page 2..N = Garment pages

      // =========================================================================
      // PAGE 1: ORDER SUMMARY MASTER SHEET
      // =========================================================================

      // 1. Top Header Banner
      doc.rect(36, 36, 523, 72).fill(lightBg);
      doc.rect(36, 36, 523, 72).stroke(cardBorder);

      // Stylized Arangtik Logo Box
      doc.roundedRect(48, 48, 48, 48, 10).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold');
      doc.text('A', 62, 57);

      // Brand Title & Tagline
      doc.fillColor(darkColor).fontSize(20).font('Helvetica-Bold');
      doc.text('ARANGTIK', 108, 50);
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica');
      doc.text('SMART LAUNDRY & WARDROBE COMPANION', 108, 73);

      // Work Order Badge (Right)
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold');
      doc.text('LAUNDRY WORK ORDER', 340, 48, { align: 'right', width: 205 });
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold');
      doc.text(order.orderNumber, 340, 64, { align: 'right', width: 205 });
      doc.fillColor(mutedColor).fontSize(8).font('Helvetica');
      doc.text(
        `Created: ${this.formatDate(order.createdAt || new Date())} • Page 1 of ${totalPages}`,
        340,
        80,
        { align: 'right', width: 205 }
      );

      // 2. Customer & Vendor Details Cards
      const cardY = 120;
      const cardHeight = 112;
      const colWidth = 254;

      // Left Box: Customer Details & Pickup Schedule
      doc.rect(36, cardY, colWidth, cardHeight).fill(lightBg);
      doc.rect(36, cardY, colWidth, cardHeight).stroke(cardBorder);

      doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold');
      doc.text('CUSTOMER DETAILS & SCHEDULE', 48, cardY + 12);
      doc.strokeColor(cardBorder).moveTo(48, cardY + 25).lineTo(275, cardY + 25).stroke();

      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold');
      doc.text(order.userName || 'Customer', 48, cardY + 33);
      doc.fillColor(mutedColor).fontSize(9.5).font('Helvetica');
      doc.text(`Phone: ${order.userPhone || 'N/A'}`, 48, cardY + 49);

      doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold');
      doc.text('Pickup Date: ', 48, cardY + 70, { continued: true });
      doc.fillColor(primaryColor).font('Helvetica');
      doc.text(this.formatDate(order.pickupDate));

      doc.fillColor(darkColor).font('Helvetica-Bold');
      doc.text('Expected Delivery: ', 48, cardY + 87, { continued: true });
      doc.fillColor(primaryColor).font('Helvetica');
      doc.text(this.formatDate(order.expectedDeliveryDate));

      // Right Box: Vendor Details & Verification
      const rightColX = 305;
      doc.rect(rightColX, cardY, colWidth, cardHeight).fill(lightBg);
      doc.rect(rightColX, cardY, colWidth, cardHeight).stroke(cardBorder);

      doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold');
      doc.text('VENDOR DETAILS & STATUS', rightColX + 12, cardY + 12);
      doc.strokeColor(cardBorder).moveTo(rightColX + 12, cardY + 25).lineTo(rightColX + 242, cardY + 25).stroke();

      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold');
      doc.text(order.vendorName || 'Laundry Vendor', rightColX + 12, cardY + 33);
      doc.fillColor(mutedColor).fontSize(9.5).font('Helvetica');
      doc.text(`Phone: ${order.vendorPhone || 'N/A'}`, rightColX + 12, cardY + 49);

      const statusTag = order.isRegisteredVendor
        ? 'Verified Registered Partner'
        : 'Direct Partner (Contact)';
      doc.fillColor(order.isRegisteredVendor ? '#059669' : '#D97706')
        .fontSize(9)
        .font('Helvetica-Bold');
      doc.text(statusTag, rightColX + 12, cardY + 70);

      doc.fillColor(mutedColor).fontSize(9).font('Helvetica');
      doc.text(`Total Garments: ${totalItems} Items`, rightColX + 12, cardY + 87);

      // 3. Special Instructions Alert (If present)
      let tableStartY = cardY + cardHeight + 14;
      if (order.specialInstructions && order.specialInstructions.trim()) {
        const instHeight = 36;
        doc.rect(36, tableStartY, 523, instHeight).fill('#FEF3C7');
        doc.rect(36, tableStartY, 523, instHeight).stroke('#FCD34D');

        doc.fillColor('#92400E').fontSize(9).font('Helvetica-Bold');
        doc.text('Pickup & Washing Special Instructions:', 46, tableStartY + 8);
        doc.fillColor('#78350F').fontSize(9).font('Helvetica');
        doc.text(order.specialInstructions.trim(), 46, tableStartY + 20, { width: 500 });

        tableStartY += instHeight + 14;
      }

      // 4. Master Garments Summary Checklist & Page Index
      doc.fillColor(darkColor).fontSize(11.5).font('Helvetica-Bold');
      doc.text('ORDER SUMMARY & GARMENT INDEX', 36, tableStartY);

      const tableTop = tableStartY + 16;
      const rowHeight = 30;

      // Table Header Row
      doc.rect(36, tableTop, 523, 24).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('#', 44, tableTop + 7, { width: 25 });
      doc.text('GARMENT NAME', 75, tableTop + 7, { width: 230 });
      doc.text('CATEGORY', 310, tableTop + 7, { width: 100 });
      doc.text('SERVICE REQUESTED', 415, tableTop + 7, { width: 95 });
      doc.text('PAGE', 515, tableTop + 7, { width: 35, align: 'right' });

      let currentY = tableTop + 24;

      if (Array.isArray(order.items)) {
        order.items.forEach((item, index) => {
          const itemPageNumber = index + 2;
          const isEven = index % 2 === 0;

          doc.rect(36, currentY, 523, rowHeight).fill(isEven ? '#FFFFFF' : '#F8FAFC');
          doc.rect(36, currentY, 523, rowHeight).stroke(cardBorder);

          doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica');
          doc.text(String(index + 1), 44, currentY + 9, { width: 25 });

          doc.fillColor(darkColor).fontSize(9.5).font('Helvetica-Bold');
          doc.text(item.name || 'Garment Item', 75, currentY + 9, {
            width: 230,
            ellipsis: true,
          });

          doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica');
          doc.text(item.category || 'General', 310, currentY + 9, {
            width: 100,
            ellipsis: true,
          });

          const serviceName = (item.serviceType || 'WASH_AND_IRON').replace(/_/g, ' ');
          doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold');
          doc.text(serviceName, 415, currentY + 9, { width: 95, ellipsis: true });

          doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold');
          doc.text(`P. ${itemPageNumber}`, 515, currentY + 9, { width: 35, align: 'right' });

          currentY += rowHeight;
        });
      }

      // Page 1 Footer Note
      const page1FooterY = Math.max(currentY + 20, 740);
      doc.rect(36, page1FooterY, 523, 40).fill('#EEF2FF');
      doc.rect(36, page1FooterY, 523, 40).stroke('#C7D2FE');

      doc.fillColor(primaryDark).fontSize(8.5).font('Helvetica-Bold');
      doc.text('📸 DEDICATED FULL-PAGE GARMENT PROFILES ATTACHED:', 46, page1FooterY + 8);
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica');
      doc.text(
        'Each selected dress has a dedicated full page with large clear photo, dress name, and service instructions on Pages 2 to ' +
          totalPages +
          '.',
        46,
        page1FooterY + 20,
        { width: 500 }
      );

      // =========================================================================
      // PAGE 2 ONWARDS: DEDICATED FULL PAGE FOR EACH GARMENT
      // =========================================================================
      if (Array.isArray(order.items)) {
        order.items.forEach((item, index) => {
          doc.addPage();
          const pageNum = index + 2;

          // 1. Top Sub-Header
          doc.rect(36, 36, 523, 36).fill(lightBg);
          doc.rect(36, 36, 523, 36).stroke(cardBorder);

          doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold');
          doc.text(`ARANGTIK WORK ORDER: ${order.orderNumber}`, 46, 49);

          doc.fillColor(primaryDark).fontSize(10).font('Helvetica-Bold');
          doc.text(
            `GARMENT #${index + 1} OF ${totalItems}  (PAGE ${pageNum}/${totalPages})`,
            300,
            49,
            { align: 'right', width: 249 }
          );

          // 2. Extra Large High-Resolution Garment Photo Box
          const photoBoxY = 82;
          const photoBoxWidth = 523;
          const photoBoxHeight = 475;

          doc.rect(36, photoBoxY, photoBoxWidth, photoBoxHeight).fill('#FFFFFF');
          doc.rect(36, photoBoxY, photoBoxWidth, photoBoxHeight).stroke(borderColor);

          const imgBuffer = imageBuffers[index];
          let imageRendered = false;

          if (imgBuffer) {
            try {
              doc.image(imgBuffer, 46, photoBoxY + 10, {
                fit: [photoBoxWidth - 20, photoBoxHeight - 20],
                align: 'center',
                valign: 'center',
              });
              imageRendered = true;
            } catch (imgErr) {
              console.warn(`[Laundry PDF]: Image rendering failed for ${item.name}: ${imgErr.message}`);
              imageRendered = false;
            }
          }

          if (!imageRendered) {
            doc.rect(46, photoBoxY + 10, photoBoxWidth - 20, photoBoxHeight - 20).fill('#F8FAFC');
            doc.fillColor(primaryColor).fontSize(56).font('Helvetica-Bold');
            doc.text('👗', 280, photoBoxY + 180, { align: 'center' });
            doc.fillColor(mutedColor).fontSize(13).font('Helvetica-Bold');
            doc.text(item.name || 'Garment Item', 36, photoBoxY + 260, {
              align: 'center',
              width: 523,
            });
            doc.fillColor(mutedColor).fontSize(10).font('Helvetica');
            doc.text('(High-res image verified in Arangtik Closet)', 36, photoBoxY + 282, {
              align: 'center',
              width: 523,
            });
          }

          // 3. Garment Details Box Below Photo
          const detailsCardY = photoBoxY + photoBoxHeight + 14;
          const detailsCardHeight = 185;

          doc.rect(36, detailsCardY, 523, detailsCardHeight).fill(lightBg);
          doc.rect(36, detailsCardY, 523, detailsCardHeight).stroke(cardBorder);

          // Garment Name
          doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold');
          doc.text(item.name || 'Garment Item', 48, detailsCardY + 14, {
            width: 500,
            ellipsis: true,
          });

          // Category Line
          doc.fillColor(mutedColor).fontSize(10).font('Helvetica');
          doc.text(`Category: ${item.category || 'General'}`, 48, detailsCardY + 36);

          doc.strokeColor(cardBorder).moveTo(48, detailsCardY + 54).lineTo(547, detailsCardY + 54).stroke();

          // Service Requested Highlight Banner
          const serviceY = detailsCardY + 64;
          doc.rect(48, serviceY, 499, 40).fill('#EEF2FF');
          doc.rect(48, serviceY, 499, 40).stroke(primaryColor);

          doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
          doc.text('SERVICE REQUESTED:', 60, serviceY + 14);

          const serviceName = (item.serviceType || 'WASH_AND_IRON').replace(/_/g, ' ');
          doc.fillColor(primaryDark).fontSize(12).font('Helvetica-Bold');
          doc.text(serviceName, 185, serviceY + 12);

          // Special Instructions Alert Box
          const itemNoteY = serviceY + 50;
          const itemNoteHeight = 44;

          if (item.specialInstructions && item.specialInstructions.trim()) {
            doc.rect(48, itemNoteY, 499, itemNoteHeight).fill('#FEF2F2');
            doc.rect(48, itemNoteY, 499, itemNoteHeight).stroke('#FECACA');

            doc.fillColor('#DC2626').fontSize(8.5).font('Helvetica-Bold');
            doc.text('⚠️ SPECIAL CARE NOTE:', 58, itemNoteY + 7);
            doc.fillColor('#991B1B').fontSize(9).font('Helvetica');
            doc.text(item.specialInstructions.trim(), 58, itemNoteY + 20, { width: 480 });
          } else {
            doc.rect(48, itemNoteY, 499, itemNoteHeight).fill('#F1F5F9');
            doc.rect(48, itemNoteY, 499, itemNoteHeight).stroke(cardBorder);

            doc.fillColor(darkColor).fontSize(8.5).font('Helvetica-Bold');
            doc.text('CARE & HANDLING:', 58, itemNoteY + 7);
            doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica');
            doc.text(
              'Standard gentle wash and iron care as suitable for this garment.',
              58,
              itemNoteY + 20,
              { width: 480 }
            );
          }

          // Bottom Verification / Customer Tag
          const garmentFooterY = detailsCardY + detailsCardHeight + 8;
          doc.fillColor(mutedColor).fontSize(8).font('Helvetica');
          doc.text(
            `Customer: ${order.userName} (${order.userPhone}) • Vendor: ${order.vendorName} • Order Ref: ${order.orderNumber}`,
            36,
            garmentFooterY,
            { align: 'center', width: 523 }
          );
        });
      }

      // Finalize PDF
      doc.end();

      writeStream.on('finish', () => {
        const publicUrl = `${BASE_URL}/uploads/work-orders/${filename}`;
        resolve({
          filePath,
          fileUrl: formatUploadUrl(publicUrl),
          filename,
          totalPages,
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = new LaundryPdfService();
