import jsPDF from "jspdf";

/**
 * Generate PDF from medical report
 */
export const generateReportPDF = (
  reportContent,
  patientInfo = {},
  reportType = "Health Report"
) => {
  const doc = new jsPDF();
  
  // Set up fonts and colors
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const textWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Header
  doc.setFillColor(33, 150, 243); // Material Blue
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.text("MEDICAL HEALTH REPORT", margin, 18);

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(`Report Type: ${reportType}`, margin, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 35);

  yPosition = 50;

  // Patient Information Section
  if (Object.keys(patientInfo).length > 0) {
    doc.setTextColor(33, 150, 243);
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("PATIENT INFORMATION", margin, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");

    const patientDetails = [];
    if (patientInfo.name) patientDetails.push(`Name: ${patientInfo.name}`);
    if (patientInfo.age) patientDetails.push(`Age: ${patientInfo.age}`);
    if (patientInfo.bloodGroup) patientDetails.push(`Blood Group: ${patientInfo.bloodGroup}`);
    if (patientInfo.allergies) patientDetails.push(`Allergies: ${patientInfo.allergies}`);
    if (patientInfo.address) patientDetails.push(`Address: ${patientInfo.address}`);

    patientDetails.forEach((detail) => {
      if (yPosition > pageHeight - margin - 5) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(detail, margin + 5, yPosition);
      yPosition += 7;
    });

    yPosition += 5;
  }

  // Report Content
  doc.setTextColor(33, 150, 243);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("MEDICAL REPORT", margin, yPosition);
  yPosition += 8;

  // Split content into lines that fit the page width
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");

  const lines = doc.splitTextToSize(reportContent, textWidth);

  lines.forEach((line) => {
    if (yPosition > pageHeight - margin - 10) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      "CONFIDENTIAL - MEDICAL RECORD",
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
  }

  // Return the PDF
  return doc;
};

/**
 * Download PDF to user's device
 */
export const downloadReportPDF = (
  reportContent,
  patientInfo = {},
  reportType = "Health Report"
) => {
  const doc = generateReportPDF(reportContent, patientInfo, reportType);
  const fileName = `${patientInfo.name || "Patient"}_${reportType.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Generate PDF from records list (summary)
 */
export const generateRecordsSummaryPDF = (records, patientInfo = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  doc.setFillColor(33, 150, 243);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("MEDICAL RECORDS SUMMARY", margin, 18);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 28);

  yPosition = 45;

  // Patient Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`Patient: ${patientInfo.name || "Unknown"}`, margin, yPosition);
  yPosition += 8;

  // Records Table
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("File Name", margin, yPosition);
  doc.text("Date", margin + 90, yPosition);
  doc.text("Size", margin + 140, yPosition);
  yPosition += 8;

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);

  records.forEach((record) => {
    if (yPosition > pageHeight - margin - 10) {
      doc.addPage();
      yPosition = margin;
    }

    const fileName = record.fileName || "Unknown";
    const displayName = fileName.length > 35 ? fileName.substring(0, 32) + "..." : fileName;
    doc.text(displayName, margin, yPosition);

    const date = record.timestamp
      ? new Date(parseInt(record.timestamp) * 1000).toLocaleDateString()
      : "Unknown";
    doc.text(date, margin + 90, yPosition);

    yPosition += 6;
  });

  return doc;
};

/**
 * Download records summary PDF
 */
export const downloadRecordsSummaryPDF = (records, patientInfo = {}) => {
  const doc = generateRecordsSummaryPDF(records, patientInfo);
  const fileName = `${patientInfo.name || "Patient"}_Records_Summary_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
