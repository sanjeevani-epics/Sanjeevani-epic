/**
 * Medical Report Generation using GROQ API (Frontend Only Version)
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * ================= PROMPTS =================
 */

function generateComprehensivePrompt(recordsContent, patientInfo) {
  return `You are a professional medical data analyst with expertise in Electronic Health Records (EHR).

PATIENT:
Name: ${patientInfo.name || "N/A"}
Age: ${patientInfo.age || "N/A"}
Blood Group: ${patientInfo.bloodGroup || "N/A"}
Allergies: ${patientInfo.allergies || "None"}

TASK:
Generate a COMPREHENSIVE HEALTH REPORT with:

1. Executive Summary
2. Medical History
3. Current Conditions
4. Clinical Findings
5. Medications
6. Risk Factors
7. Patient Recommendations
8. Doctor Recommendations
9. Follow-up Actions

RULES:
- No guessing
- Use only given data
- Be structured and clear

RECORDS:
${recordsContent}

OUTPUT:`;
}

function generateSummaryPrompt(recordsContent, patientInfo) {
  return `Generate a SHORT medical summary:

Patient: ${patientInfo.name || "Unknown"}
Age: ${patientInfo.age || "N/A"}

Include:
- Health Status (1 line)
- Diagnoses
- Treatments
- Concerns
- Next Steps

Records:
${recordsContent}`;
}

function generateDiagnosticPrompt(recordsContent, patientInfo) {
  return `Generate DIAGNOSTIC REPORT:

Patient: ${patientInfo.name || "Unknown"}

Include:
- Possible Diagnoses
- Differential Diagnoses
- Tests Required
- Red Flags
- Specialists

Records:
${recordsContent}`;
}

/**
 * ================= MAIN GENERATOR =================
 */

export const generateMedicalReport = async (
  recordsContent,
  patientInfo = {},
  reportType = "comprehensive"
) => {

  if (!GROQ_API_KEY) {
    throw new Error("❌ GROQ API key missing. Add VITE_GROQ_API_KEY in .env");
  }

  const prompts = {
    comprehensive: generateComprehensivePrompt,
    summary: generateSummaryPrompt,
    diagnostic: generateDiagnosticPrompt,
  };

  const prompt = (prompts[reportType] || prompts.comprehensive)(
    recordsContent,
    patientInfo
  );

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a highly accurate medical AI assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 2048,
        top_p: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: ${errorText}`);
    }

    const data = await response.json();

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("API connected, but no text was generated.");
    }

    return text;

  } catch (err) {
    console.error("❌ Groq Error:", err);
    throw err;
  }
};

/**
 * ================= HELPERS =================
 */

export const generateReportWithImages = async (
  recordsContent,
  patientInfo = {},
  reportType = "comprehensive"
) => {
  return generateMedicalReport(recordsContent, patientInfo, reportType);
};

export const combineRecordsForProcessing = (
  recordsArray,
  maxRecords = 10
) => {
  if (!recordsArray?.length) {
    throw new Error("No records provided");
  }

  return recordsArray
    .slice(0, maxRecords)
    .map((record, index) => {
      return `
[RECORD ${index + 1}]
File: ${record.fileName || "Unknown"}
Date: ${
        record.timestamp
          ? new Date(parseInt(record.timestamp) * 1000).toLocaleDateString()
          : "Unknown"
      }
Content: ${record.content || "No content"}
---`;
    })
    .join("\n");
};