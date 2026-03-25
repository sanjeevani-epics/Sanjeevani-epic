# Reports Module Setup Guide

## Overview

The Sanjeevani EMR system now includes a powerful independent **Reports Module** that allows both doctors and patients to generate comprehensive health reports using AI (Gemini API).

## Features

### For Doctors

- Search any patient by wallet address
- Select specific patient records
- Generate comprehensive, summary, or diagnostic reports
- Download reports as PDF
- Access patient history for diagnosis support

### For Patients

- Generate personal health reports from own records
- Multiple report types (comprehensive, summary, diagnostic)
- View medical profile with allergies, blood group, etc.
- Download personalized reports as PDF
- Privacy-protected: Can only access own records

## Installation

The required packages have been added to `package.json`:

- **jspdf** (^2.5.1) - PDF generation
- **pdfjs-dist** (^4.0.0) - PDF parsing and text extraction

If you haven't installed them yet, run:

```bash
cd client
npm install
```

## Environment Setup

### 1. Get Gemini API Key (Free)

1. Go to [Google AI Studio](https://makersuite.google.com)
2. Click "Create API Key"
3. Select "Create new free API key in new Google Cloud project"
4. Copy the API key

### 2. Configure Environment Variables

Create a `.env.local` file in the `client/` directory:

```env
# Gemini API for report generation
VITE_GEMINI_API_KEY=your_api_key_here

# Other existing variables...
VITE_CONTRACT_ADDRESS=your_contract_address
```

### 3. Verify Setup

After adding the environment variable:

1. Restart the development server: `npm run dev`
2. Navigate to the Reports page
3. You should see no "API key not configured" errors

## Using the Reports Feature

### Doctor Workflow

1. **Navigate** to Reports page from main navigation
2. **Select** "Doctor Mode - Patient Reports" tab
3. **Enter** patient's wallet address (0x...)
4. **Click** "Search" to fetch patient records
5. **Select** records to include (use "Select All" for all)
6. **Choose** report type:
   - **Comprehensive Report** - Full analysis for detailed diagnosis
   - **Summary Report** - Quick overview of patient health
   - **Diagnostic Analysis** - Help with differential diagnosis
7. **Click** "Generate Report"
8. **Review** generated content in modal
9. **Download** as PDF using "Download PDF" button

### Patient Workflow

1. **Navigate** to Reports page from main navigation
2. **View** "Patient Mode - My Reports" tab (auto-selected if only patient)
3. **Review** your medical profile at the top
4. **See** list of your uploaded records
5. **Choose** report type
6. **Click** "Generate My Report"
7. **Review** AI-generated health summary
8. **Download** personalized report as PDF

## How It Works

### Report Generation Flow

```
Patient Records (from IPFS/Blockchain)
         ↓
Extract Text Content (PDF, images, text files)
         ↓
Send to Gemini API with Medical Prompt
         ↓
AI Analyzes Records & Generates Report
         ↓
Display in Modal + Export to PDF
```

### File Processing

- **PDF Files**: Text extraction via pdfjs-dist
- **Images**: Converted to base64 for vision API (future enhancement)
- **Text Files**: Direct content reading
- **IPFS Retrieval**: Automatic fetching from IPFS gateway

### AI Prompts

Each report type uses specialized prompts:

1. **Comprehensive Report**
   - Executive summary
   - Medical history overview
   - Current conditions & diagnoses
   - Clinical findings
   - Medications & treatments
   - Risk factors
   - Patient recommendations
   - Provider recommendations
   - Follow-up actions

2. **Summary Report**
   - Brief health status (1 sentence)
   - Main diagnoses (bullets)
   - Current treatments
   - Key concerns
   - Recommended next steps

3. **Diagnostic Analysis**
   - Preliminary diagnoses
   - Differential diagnoses
   - Recommended diagnostic tests
   - Red flags requiring urgent attention
   - Specialist referral suggestions

## Access Control

### Role-Based Restrictions

```
Doctor:
  ✓ Search any patient by wallet address
  ✓ Generate reports for patients with consent history
  ✓ See all patient records (that exist on blockchain)
  ✓ Multiple report types available

Patient:
  ✓ Generate reports for own records only
  ✓ Cannot access other patients' data
  ✓ Cannot search other wallets
  ✓ Multiple report types available
```

### Privacy & Security

- Reports are generated in real-time from blockchain data
- Patient data for self-reports never leaves their session
- Doctor searches are validated via smart contract
- No data is stored on Reports page
- All files fetched from IPFS with integrity checks
- PDF downloads stored locally on user device only

## Troubleshooting

### "API key not configured" Error

**Solution**: Add `VITE_GEMINI_API_KEY` to `.env.local` and restart dev server

### "Failed to fetch from IPFS" Error

**Cause**: File not available on IPFS (IPFS node may be down)
**Solution**:

- Check IPFS gateway status
- Verify CID is correct
- Re-upload the record from Patient/Doctor page

### "No records found for this patient"

**Causes**:

- Patient address is incorrect
- Patient has no records uploaded
- Wallet address format is invalid (must start with 0x)

**Solution**: Double-check wallet address format

### Report Generation Timeout

**Cause**: Large files or slow IPFS connection
**Solution**:

- Try with fewer records selected
- Check internet connection
- Split reports into smaller batches

## API Rate Limits

**Gemini Free Tier Limits**:

- 60 requests per minute
- 10,000 requests per day
- Token limits per request

For production:

- Upgrade to Gemini API paid tier
- Implement request queuing
- Cache reports for frequent queries

## File Structure

```
client/
├── src/
│   ├── pages/
│   │   ├── Reports.jsx          (Main Reports page)
│   │   ├── doctor/
│   │   └── patient/
│   ├── utils/
│   │   ├── fileExtractor.js     (Extract text from files)
│   │   ├── aiReportGenerator.js (Gemini API integration)
│   │   └── reportToPDF.js       (PDF generation & download)
│   ├── components/
│   │   └── layouts/
│   │       └── MainLayout.jsx   (Updated with Reports nav)
│   └── routes.jsx               (Updated with Reports route)
├── .env.local                   (Add your API key here)
└── package.json                 (Added jspdf, pdfjs-dist)
```

## Future Enhancements

- [ ] OCR for handwritten prescriptions/notes
- [ ] Image-based medical test interpretation
- [ ] Report scheduling for automated generation
- [ ] Multi-language report generation
- [ ] Doctor verification/approval workflow for patient reports
- [ ] Report comparison (patient progress tracking)
- [ ] Integration with other LLMs (Claude, GPT-4)
- [ ] Reports database/history storage
- [ ] Email delivery of generated reports

## Performance Notes

- Processing 5-10 records: ~10-30 seconds
- Larger file sizes or poor internet: Slower processing
- PDF generation: Usually < 2 seconds
- IPFS retrieval: Varies by network (typically 2-10 seconds)

## Support

For issues or questions:

1. Check troubleshooting section above
2. Verify `.env.local` configuration
3. Check browser console for detailed errors (F12)
4. Verify Gemini API key validity at [makersuite.google.com](https://makersuite.google.com)
