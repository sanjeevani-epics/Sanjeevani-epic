import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract text content from various file types
 */
export const extractFromFile = async (file) => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return await extractPdfText(file);
  } 
  else if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return await extractTextFile(file);
  } 
  else if (fileType.startsWith("image/")) {
    return await extractImageAsBase64(file);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
};

const extractPdfText = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      text += `[Page ${i}]\n${pageText}\n\n`;
    }

    return text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

const extractTextFile = async (file) => {
  try {
    return await file.text();
  } catch (error) {
    throw new Error(`Failed to read text file: ${error.message}`);
  }
};

const extractImageAsBase64 = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        dataUrl: e.target.result,
        mimeType: file.type,
        isImage: true,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
};

export const extractFromIPFS = async (cid, fileName) => {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`
  ];

  for (const url of gateways) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      return await extractFromFile(file);

    } catch (error) {
      console.warn("Gateway failed:", url, error.message);
      continue;
    }
  }

  throw new Error("All IPFS gateways failed.");
};