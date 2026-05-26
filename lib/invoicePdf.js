import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { INVOICE_ISSUER } from "./invoiceIssuer";
import { formatInrForPdf, textForPdf, SUCCESS_FEE_RATE } from "./successFees";

const LOGO_PATH = path.join(process.cwd(), "public", "images", "logo.png");
const HEADER_BAND_HEIGHT = 96;
const ACCENT_HEIGHT = 4;
const LOGO_MAX_WIDTH = 200;
const LOGO_MAX_HEIGHT = 48;

const teal = rgb(0, 0.74, 0.83);
const navy = rgb(0.16, 0.17, 0.39);

async function loadLogoImage(pdfDoc) {
  try {
    const bytes = await readFile(LOGO_PATH);
    const image = await pdfDoc.embedPng(bytes);
    return {
      image,
      width: image.width,
      height: image.height,
    };
  } catch (err) {
    console.warn("Invoice PDF: logo not loaded, using text header.", err?.message);
    return null;
  }
}

function scaleLogoDims(imgWidth, imgHeight) {
  const scale = Math.min(
    LOGO_MAX_WIDTH / imgWidth,
    LOGO_MAX_HEIGHT / imgHeight,
    1
  );
  return { width: imgWidth * scale, height: imgHeight * scale };
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * @param {object} data
 * @param {string} data.invoiceNumber
 * @param {string} data.issueDate
 * @param {object} data.billTo
 * @param {number} data.claimAmount
 * @param {number} data.successFee
 * @param {number} data.total
 * @param {string} [data.claimNo]
 * @param {string} [data.policyNo]
 */
export async function generateInvoicePdf(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const indigo = rgb(0.31, 0.27, 0.9);
  const slate = rgb(0.2, 0.25, 0.33);
  const muted = rgb(0.45, 0.5, 0.58);
  const white = rgb(1, 1, 1);

  const draw = (text, options) =>
    page.drawText(textForPdf(text), options);

  const logo = await loadLogoImage(pdfDoc);
  const headerBottom = height - HEADER_BAND_HEIGHT - ACCENT_HEIGHT;

  if (logo) {
    page.drawRectangle({
      x: 0,
      y: headerBottom + ACCENT_HEIGHT,
      width,
      height: HEADER_BAND_HEIGHT,
      color: white,
    });
    page.drawRectangle({
      x: 0,
      y: headerBottom,
      width,
      height: ACCENT_HEIGHT,
      color: teal,
    });

    const { width: logoW, height: logoH } = scaleLogoDims(
      logo.width,
      logo.height
    );
    const logoX = 40;
    const logoY =
      headerBottom +
      ACCENT_HEIGHT +
      (HEADER_BAND_HEIGHT - logoH) / 2;

    page.drawImage(logo.image, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });

    const taxLabel = "TAX INVOICE";
    const taxSize = 14;
    const taxWidth = fontBold.widthOfTextAtSize(
      textForPdf(taxLabel),
      taxSize
    );
    draw(taxLabel, {
      x: width - 48 - taxWidth,
      y: headerBottom + ACCENT_HEIGHT + HEADER_BAND_HEIGHT / 2 - 6,
      size: taxSize,
      font: fontBold,
      color: navy,
    });
  } else {
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width,
      height: 100,
      color: indigo,
    });
    draw(INVOICE_ISSUER.legalName, {
      x: 48,
      y: height - 48,
      size: 22,
      font: fontBold,
      color: white,
    });
    draw(INVOICE_ISSUER.tagline, {
      x: 48,
      y: height - 68,
      size: 10,
      font,
      color: rgb(0.85, 0.88, 1),
    });
    draw("TAX INVOICE", {
      x: width - 160,
      y: height - 52,
      size: 14,
      font: fontBold,
      color: white,
    });
  }

  let y = height - 118;

  draw(`Invoice No: ${data.invoiceNumber}`, {
    x: 48,
    y,
    size: 11,
    font: fontBold,
    color: slate,
  });
  draw(`Date: ${data.issueDate || formatDate()}`, {
    x: width - 200,
    y,
    size: 11,
    font,
    color: slate,
  });
  y -= 28;

  draw("Bill To", { x: 48, y, size: 10, font: fontBold, color: muted });
  y -= 16;
  draw(data.billTo.name || "-", {
    x: 48,
    y,
    size: 12,
    font: fontBold,
    color: slate,
  });
  y -= 14;
  if (data.billTo.email) {
    draw(data.billTo.email, { x: 48, y, size: 10, font, color: slate });
    y -= 14;
  }
  const address = (data.billTo.address || "").split("\n").filter(Boolean);
  for (const line of address.slice(0, 4)) {
    draw(line, { x: 48, y, size: 10, font, color: slate });
    y -= 14;
  }

  if (data.claimNo || data.policyNo) {
    y -= 8;
    if (data.claimNo) {
      draw(`Claim No: ${data.claimNo}`, {
        x: 48,
        y,
        size: 10,
        font,
        color: muted,
      });
      y -= 14;
    }
    if (data.policyNo) {
      draw(`Policy No: ${data.policyNo}`, {
        x: 48,
        y,
        size: 10,
        font,
        color: muted,
      });
      y -= 14;
    }
  }

  y -= 20;

  // Table header
  const tableLeft = 48;
  const tableRight = width - 48;
  const colAmount = tableRight - 120;
  page.drawRectangle({
    x: tableLeft,
    y: y - 4,
    width: tableRight - tableLeft,
    height: 22,
    color: rgb(0.93, 0.94, 0.99),
    borderColor: rgb(0.82, 0.84, 0.92),
    borderWidth: 1,
  });
  draw("Description", {
    x: tableLeft + 10,
    y: y + 2,
    size: 10,
    font: fontBold,
    color: slate,
  });
  draw("Amount", {
    x: colAmount,
    y: y + 2,
    size: 10,
    font: fontBold,
    color: slate,
  });
  y -= 26;

  const rows = [
    {
      label: "Claim amount (reference)",
      amount: formatInrForPdf(data.claimAmount),
      muted: true,
    },
    {
      label: `Success fee (${SUCCESS_FEE_RATE * 100}% of claim)`,
      amount: formatInrForPdf(data.successFee),
    },
  ];

  for (const row of rows) {
    page.drawLine({
      start: { x: tableLeft, y: y + 18 },
      end: { x: tableRight, y: y + 18 },
      thickness: 0.5,
      color: rgb(0.9, 0.91, 0.94),
    });
    draw(row.label, {
      x: tableLeft + 10,
      y: y + 4,
      size: 10,
      font,
      color: row.muted ? muted : slate,
    });
    draw(row.amount, {
      x: colAmount,
      y: y + 4,
      size: 10,
      font,
      color: slate,
    });
    y -= 24;
  }

  // Total row
  page.drawRectangle({
    x: tableLeft,
    y: y - 2,
    width: tableRight - tableLeft,
    height: 28,
    color: rgb(0.88, 0.9, 1),
    borderColor: indigo,
    borderWidth: 1,
  });
  draw("Total payable", {
    x: tableLeft + 10,
    y: y + 6,
    size: 12,
    font: fontBold,
    color: indigo,
  });
  draw(formatInrForPdf(data.total), {
    x: colAmount,
    y: y + 6,
    size: 12,
    font: fontBold,
    color: indigo,
  });
  y -= 50;

  // Issuer footer block
  draw("From", { x: 48, y, size: 10, font: fontBold, color: muted });
  y -= 14;
  draw(INVOICE_ISSUER.legalName, {
    x: 48,
    y,
    size: 10,
    font: fontBold,
    color: slate,
  });
  y -= 14;
  for (const line of INVOICE_ISSUER.addressLines) {
    draw(line, { x: 48, y, size: 9, font, color: slate });
    y -= 12;
  }
  if (INVOICE_ISSUER.email) {
    draw(`Email: ${INVOICE_ISSUER.email}`, {
      x: 48,
      y: y - 2,
      size: 9,
      font,
      color: slate,
    });
  }

  const footerY = 56;
  page.drawLine({
    start: { x: 48, y: footerY + 20 },
    end: { x: width - 48, y: footerY + 20 },
    thickness: 0.5,
    color: rgb(0.85, 0.87, 0.9),
  });
  draw(
    "This is a computer-generated invoice. Payment is due as per your service agreement.",
    { x: 48, y: footerY, size: 8, font, color: muted }
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
