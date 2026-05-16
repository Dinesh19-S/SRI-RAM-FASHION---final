import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceTemplate from '../components/InvoiceTemplate';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PDF_SCALE = 2;

const waitForRenderFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const sanitizeFileName = (value) =>
  String(value || 'invoice')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 180);

const withTemporaryInvoiceElement = async ({ bill = {}, settings = {}, isEmpty = false }, work) => {
  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-100000px';
  mountNode.style.top = '0';
  mountNode.style.width = `${A4_WIDTH_PX}px`;
  mountNode.style.height = `${A4_HEIGHT_PX}px`;
  mountNode.style.zIndex = '-1';
  mountNode.setAttribute('aria-hidden', 'true');
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(createElement(InvoiceTemplate, { bill, settings, isEmpty }));
  await waitForRenderFrame();

  const element = mountNode.querySelector('#invoice-paper') || mountNode.firstElementChild;
  if (!element) {
    root.unmount();
    mountNode.remove();
    throw new Error('Failed to render invoice template');
  }

  try {
    return await work(element);
  } finally {
    root.unmount();
    mountNode.remove();
  }
};

const canvasFromInvoiceElement = async (element) => html2canvas(element, {
  backgroundColor: '#ffffff',
  scale: PDF_SCALE,
  useCORS: true,
  logging: false,
  width: A4_WIDTH_PX,
  height: A4_HEIGHT_PX,
  windowWidth: A4_WIDTH_PX,
  windowHeight: A4_HEIGHT_PX,
  scrollX: 0,
  scrollY: 0
});

const pdfFromCanvas = (canvas) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [A4_WIDTH_PX, A4_HEIGHT_PX],
    compress: true,
    hotfixes: ['px_scaling']
  });

  const imageData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imageData, 'PNG', 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX, undefined, 'FAST');
  return pdf;
};

const elementToPdfArtifact = async (element, preferredName) => {
  const canvas = await canvasFromInvoiceElement(element);
  const pdf = pdfFromCanvas(canvas);
  const blob = pdf.output('blob');
  const safeName = sanitizeFileName(preferredName || 'SRI_RAM_FASHIONS_Invoice.pdf');
  const file = new File([blob], safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`, {
    type: 'application/pdf'
  });
  return { pdf, blob, file };
};

const resolveInvoiceFileName = (bill, filename) => {
  if (filename) return filename;
  return `SRI_RAM_FASHIONS_Invoice_${bill?.billNumber || 'bill'}.pdf`;
};

const downloadBlob = (blob, filename) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
};

const collectPrintStyles = () =>
  Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');

const printMarkup = (invoiceMarkup) => {
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to print invoices.');
  }

  const styles = collectPrintStyles();
  printWindow.document.write(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice Print</title>
  ${styles}
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body { display: flex; justify-content: center; }
    .invoice-template { margin: 0 !important; box-shadow: none !important; }
  </style>
</head>
<body>${invoiceMarkup}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
};

const withInvoiceElement = async ({ bill, settings, isEmpty, element }, work) => {
  if (element instanceof HTMLElement) {
    return work(element);
  }

  return withTemporaryInvoiceElement({ bill, settings, isEmpty }, work);
};

export const generateInvoicePdfArtifact = async (bill = {}, settings = {}, options = {}) => {
  const { element = null, filename = null, isEmpty = false } = options;
  const desiredName = resolveInvoiceFileName(bill, filename);
  return withInvoiceElement({ bill, settings, isEmpty, element }, (invoiceElement) =>
    elementToPdfArtifact(invoiceElement, desiredName)
  );
};

export const downloadInvoicePDF = async (bill = {}, settings = {}, filename = null, options = {}) => {
  const artifact = await generateInvoicePdfArtifact(bill, settings, { ...options, filename });
  downloadBlob(artifact.blob, artifact.file.name);
  return artifact;
};

export const downloadEmptyTemplate = async (settings = {}, filename = 'SRI_RAM_FASHIONS_Empty_Template.pdf', options = {}) => {
  const artifact = await generateInvoicePdfArtifact({}, settings, {
    ...options,
    filename,
    isEmpty: true
  });
  downloadBlob(artifact.blob, artifact.file.name);
  return artifact;
};

export const printInvoice = async (bill = {}, settings = {}, options = {}) => {
  const { element = null, isEmpty = false } = options;
  return withInvoiceElement({ bill, settings, isEmpty, element }, (invoiceElement) => {
    printMarkup(invoiceElement.outerHTML);
    return true;
  });
};

export const shareInvoice = async (bill = {}, settings = {}, options = {}) => {
  const { element = null, filename = null, title = 'Invoice', text = 'Invoice from SRI RAM FASHIONS' } = options;
  const artifact = await generateInvoicePdfArtifact(bill, settings, { element, filename });

  if (navigator.share && navigator.canShare?.({ files: [artifact.file] })) {
    await navigator.share({
      title,
      text,
      files: [artifact.file]
    });
    return { ...artifact, shared: true };
  }

  downloadBlob(artifact.blob, artifact.file.name);
  return { ...artifact, shared: false };
};

export const generateInvoicePdfFile = async (bill = {}, settings = {}, options = {}) => {
  const artifact = await generateInvoicePdfArtifact(bill, settings, options);
  return artifact.file;
};

export default {
  generateInvoicePdfArtifact,
  downloadInvoicePDF,
  downloadEmptyTemplate,
  printInvoice,
  shareInvoice,
  generateInvoicePdfFile
};
