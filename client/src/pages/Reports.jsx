import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Backdrop,
  CircularProgress,
  Button,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Modal,
  Fade,
} from "@mui/material";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";

import useEth from "../contexts/EthContext/useEth";
import useAlert from "../contexts/AlertContext/useAlert";
import CustomButton from "../components/CustomButton";
import { extractFromIPFS } from "../utils/fileExtractor";
import { generateMedicalReport, combineRecordsForProcessing } from "../utils/aiReportGenerator";
import { downloadReportPDF, downloadRecordsSummaryPDF } from "../utils/reportToPDF";

const Reports = () => {
  const {
    state: { contract, accounts, role, loading: ethLoading },
  } = useEth();
  const { setAlert } = useAlert();

  // ============ STATE MANAGEMENT ============
  const [selectedTab, setSelectedTab] = useState(0);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Doctor Mode
  const [doctorPatientSearch, setDoctorPatientSearch] = useState("");
  const [doctorPatientInfo, setDoctorPatientInfo] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [doctorConsent, setDoctorConsent] = useState(null);
  const [consentExpiring, setConsentExpiring] = useState(false);

  // Patient Mode
  const [patientOwnRecords, setPatientOwnRecords] = useState([]);
  const [patientProfile, setPatientProfile] = useState({
    name: "",
    age: "",
    bloodGroup: "",
    allergies: "",
  });

  // Report Generation
  const [reportType, setReportType] = useState("comprehensive");
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportMetadata, setReportMetadata] = useState(null);

  // ============ DOCTOR MODE FUNCTIONS ============

  /**
   * Search for patient by wallet address (Doctor only)
   * Uses same consent checking as Doctor page
   */
  const searchPatientByAddress = useCallback(async () => {
    if (!doctorPatientSearch.trim()) {
      setAlert("error", "Please enter a patient wallet address");
      return;
    }

    // Validate wallet address format
    if (!/^(0x)?[0-9a-f]{40}$/i.test(doctorPatientSearch)) {
      setAlert("error", "Invalid wallet address format. Must be a valid Ethereum address (0x...)");
      return;
    }

    if (!contract || !accounts?.length) {
      setAlert("error", "Contract or account not available");
      return;
    }

    setIsLoading(true);
    try {
      // Check if patient exists
      const exists = await contract.methods
        .getPatientExists(doctorPatientSearch)
        .call({ from: accounts[0] });

      if (!exists) {
        setAlert("error", "Patient does not exist in the system");
        setPatientRecords([]);
        setDoctorPatientInfo(null);
        setDoctorConsent(null);
        return;
      }

      // STEP 1: Check consent using same method as Doctor page
      let consentData = null;
      try {
        consentData = await contract.methods
          .patientConsents(doctorPatientSearch, accounts[0])
          .call();
      } catch (e) {
        console.error("Could not fetch consent info", e);
        consentData = null;
      }

      // Check if authorized
      if (!consentData || !consentData.isAuthorized) {
        setAlert(
          "error",
          "Access Denied: You do not have permission to access this patient's records. Please request access from the patient first."
        );
        setPatientRecords([]);
        setDoctorPatientInfo(null);
        setDoctorConsent(null);
        return;
      }

      // STEP 2: Check if consent is expired
      const validUntilMs = Number(consentData.validUntil) * 1000;
      const timeDiff = validUntilMs - Date.now();
      const isExpired = timeDiff <= 0;
      const isExpiring = timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;

      if (isExpired) {
        setAlert(
          "error",
          "Consent Expired: Your access to this patient's records has expired. Please request a new consent from the patient."
        );
        setPatientRecords([]);
        setDoctorPatientInfo(null);
        setDoctorConsent(null);
        return;
      }

      // Store consent info
      setDoctorConsent(consentData);
      setConsentExpiring(isExpiring);

      if (isExpiring) {
        setAlert("warning", "Your access to this patient expires within 24 hours");
      }

      // STEP 3: Fetch patient records (now we have access)
      const records = await contract.methods
        .getRecords(doctorPatientSearch)
        .call({ from: accounts[0] });

      if (!records || records.length === 0) {
        setAlert("warning", "Patient has no records available yet");
        setPatientRecords([]);
        setDoctorPatientInfo({
          address: doctorPatientSearch,
          recordCount: 0,
          lastUpdated: new Date().toLocaleDateString(),
          authorized: true,
        });
        return;
      }

      setPatientRecords(records);
      setDoctorPatientInfo({
        address: doctorPatientSearch,
        recordCount: records.length,
        lastUpdated: new Date().toLocaleDateString(),
        authorized: true,
        validUntil: new Date(validUntilMs).toLocaleDateString(),
      });

      setAlert("success", `Access granted! Found ${records.length} records for patient`);
      setSelectedRecords([]); // Reset selection
    } catch (error) {
      console.error("Error searching patient:", error);
      setAlert("error", `Failed to search patient: ${error.message}`);
      setPatientRecords([]);
      setDoctorPatientInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [doctorPatientSearch, contract, accounts, setAlert]);

  // ============ PATIENT MODE FUNCTIONS ============

  /**
   * Load patient's own records (Patient only)
   */
  const loadPatientOwnRecords = useCallback(async () => {
    console.log("early return ")
    if (!contract || !accounts?.length) {
      setAlert("error", "Contract or account not available");
      return;
    }

    setIsLoading(true);
    try {
      const records = await contract.methods
        .getRecords(accounts[0])
        .call({ from: accounts[0] });


      // Load patient profile from localStorage
      const savedProfile = localStorage.getItem(`profile_${accounts[0]}`);
      const profile = savedProfile
        ? JSON.parse(savedProfile)
        : { name: "", age: "", bloodGroup: "", allergies: "" };

      setPatientOwnRecords(records || []);
      console.log(`[Reports] Loaded ${records.length} records for patient`);
      setPatientProfile(profile);
    } catch (error) {
      console.error("Error loading patient records:", error);
      setAlert("error", "Failed to load your records");
    } finally {
      setIsLoading(false);
    }
  }, [contract, accounts, setAlert]);

  // Load appropriate data on mount or when switching tabs
  useEffect(() => {
    if (!contract || !accounts?.length) return;

    if (role === "doctor" && selectedTab === 0) {
      // Doctor tab
      setPatientRecords([]);
      setSelectedRecords([]);
    } else if (role === "patient" || (role === "doctor" && selectedTab === 1)) {
    console.log("[Reports] Loading patient own records..."); 
    loadPatientOwnRecords();
  }
  }, [selectedTab, role, contract, accounts, loadPatientOwnRecords]);

  // ============ REPORT GENERATION ============

  /**
   * Generate report from selected records
   */
  const handleGenerateReport = useCallback(
    async (records, patientInfo, isDoctor = false) => {
      if (!records || records.length === 0) {
        setAlert("error", "Please select at least one record to process");
        return;
      }

      setReportGenerating(true);
      try {
        console.log(`[Reports] Starting report generation for ${records.length} records`, records);
        
        // Extract content from selected records
        console.log("[Reports] Extracting content from IPFS...");
        const recordsContent = await Promise.all(
          records.map(async (record, index) => {
            try {
              console.log(`[Reports] Extracting record ${index + 1}/${records.length}: ${record.fileName} (CID: ${record.cid})`);
              const content = await extractFromIPFS(record.cid, record.fileName);
              console.log(`[Reports] Successfully extracted: ${record.fileName}`);
              return {
                index: index + 1,
                fileName: record.fileName,
                timestamp: record.timestamp,
                content:
                  typeof content === "string"
                    ? content.substring(0, 1000) // Limit content size
                    : JSON.stringify(content).substring(0, 1000),
              };
            } catch (err) {
              console.error(`[Reports] Error extracting file ${record.fileName}:`, err);
              return {
                index: index + 1,
                fileName: record.fileName,
                timestamp: record.timestamp,
                content: `[Failed to extract: ${err.message}]`,
              };
            }
          })
        );

        console.log("[Reports] All records extracted. Combining content...");
        // Combine records for processing
        const combinedContent = combineRecordsForProcessing(recordsContent, 10);

        console.log("[Reports] Sending to Gemini API for analysis...");
        // Generate report using AI
        const report = await generateMedicalReport(
          combinedContent,
          patientInfo,
          reportType
        );

        console.log("[Reports] Report generated successfully!");
        setGeneratedReport(report);
        setReportMetadata({
          patientInfo,
          recordsProcessed: records.length,
          reportType,
          generatedAt: new Date().toLocaleString(),
          isDoctor,
        });
        setReportModalOpen(true);

        setAlert("success", "Report generated successfully!");
      } catch (error) {
        console.error("[Reports] CRITICAL ERROR:", error);
        console.error("[Reports] Stack trace:", error.stack);
        setAlert("error", `Failed to generate report: ${error.message}`);
      } finally {
        setReportGenerating(false);
      }
    },
    [reportType, setAlert]
  );

  /**
   * Handle doctor generating report
   * Double-checks consent before processing
   */
  const handleDoctorGenerateReport = () => {
    console.log("[Reports] handleDoctorGenerateReport called");
    console.log("[Reports] doctorConsent:", doctorConsent);
    console.log("[Reports] selectedRecords:", selectedRecords);
    console.log("[Reports] patientRecords:", patientRecords);
    
    // Final consent check before report generation
    if (!doctorConsent || !doctorConsent.isAuthorized) {
      console.log("[Reports] Consent check failed");
      setAlert("error", "Access Denied: You do not have valid consent to access this patient's records");
      return;
    }

    // Check consent expiration again
    const validUntilMs = Number(doctorConsent.validUntil) * 1000;
    if (Date.now() >= validUntilMs) {
      console.log("[Reports] Consent expired");
      setAlert("error", "Consent Expired: Your access to this patient's records has expired");
      return;
    }

    if (!selectedRecords.length) {
      console.log("[Reports] No records selected");
      setAlert("error", "Please select records to include in report");
      return;
    }

    console.log("[Reports] Filtering records...");
    const recordsToProcess = patientRecords.filter((r) =>
      selectedRecords.includes(r.cid)
    );
    console.log("[Reports] Records to process:", recordsToProcess);

    handleGenerateReport(recordsToProcess, doctorPatientInfo, true);
  };

  /**
   * Handle patient generating report
   */
  const handlePatientGenerateReport = () => {
    handleGenerateReport(patientOwnRecords, patientProfile, false);
  };

  /**
   * Download generated report as PDF
   */
  const handleDownloadReport = () => {
    if (!generatedReport || !reportMetadata) return;

    downloadReportPDF(
      generatedReport,
      reportMetadata.patientInfo,
      `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Health Report`
    );
    setAlert("success", "Report downloaded successfully!");
  };

  /**
   * Toggle record selection (Doctor mode)
   */
  const toggleRecordSelection = (cid) => {
    setSelectedRecords((prev) =>
      prev.includes(cid) ? prev.filter((c) => c !== cid) : [...prev, cid]
    );
  };

  /**
   * Select/Deselect all records
   */
  const toggleSelectAllRecords = () => {
    if (selectedRecords.length === patientRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(patientRecords.map((r) => r.cid));
    }
  };

  // ============ RENDER CONDITIONS ============

  if (ethLoading) {
    return (
      <Backdrop open={true}>
        <CircularProgress />
      </Backdrop>
    );
  }

  if (!contract || !accounts?.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please connect your wallet and ensure you are registered as a doctor or patient
        </Alert>
      </Box>
    );
  }

  const isDoctor = role === "doctor";
  const isPatient = role === "patient";

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <AssessmentRoundedIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <div>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Medical Report Generator
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {isDoctor
                ? "Generate comprehensive health reports for your patients"
                : "Generate summary reports of your medical records"}
            </Typography>
          </div>
        </Box>
      </Box>

      {/* Role-based Tabs */}
      {isDoctor && isPatient ? (
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label="Doctor Mode - Patient Reports"
            icon={<StorageRoundedIcon />}
            iconPosition="start"
          />
          <Tab
            label="Patient Mode - My Reports"
            icon={<StorageRoundedIcon />}
            iconPosition="start"
          />
        </Tabs>
      ) : null}

      {/* ============ DOCTOR MODE ============ */}
      {isDoctor && (selectedTab === 0 || !isPatient) && (
        <DoctorReportSection
          doctorPatientSearch={doctorPatientSearch}
          setDoctorPatientSearch={setDoctorPatientSearch}
          searchPatientByAddress={searchPatientByAddress}
          isLoading={isLoading}
          doctorPatientInfo={doctorPatientInfo}
          patientRecords={patientRecords}
          selectedRecords={selectedRecords}
          toggleRecordSelection={toggleRecordSelection}
          toggleSelectAllRecords={toggleSelectAllRecords}
          reportType={reportType}
          setReportType={setReportType}
          handleGenerateReport={handleDoctorGenerateReport}
          reportGenerating={reportGenerating}
          doctorConsent={doctorConsent}
          consentExpiring={consentExpiring}
        />
      )}

      {/* ============ PATIENT MODE ============ */}
      {isPatient && (selectedTab === 1 || !isDoctor) && (
        <PatientReportSection
          patientOwnRecords={patientOwnRecords}
          patientProfile={patientProfile}
          reportType={reportType}
          setReportType={setReportType}
          handleGenerateReport={handlePatientGenerateReport}
          reportGenerating={reportGenerating}
          isLoading={isLoading}
        />
      )}

      {/* ============ GENERATED REPORT MODAL ============ */}
      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        closeAfterTransition
      >
        <Fade in={reportModalOpen}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: 900,
              maxHeight: "85vh",
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 24,
              overflow: "auto",
              p: 4,
            }}
          >
            {/* Report Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <div>
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                  Medical Report - {reportMetadata?.reportType.charAt(0).toUpperCase() +
                    reportMetadata?.reportType.slice(1)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Generated: {reportMetadata?.generatedAt}
                </Typography>
              </div>
              <Button
                variant="contained"
                startIcon={<DownloadRoundedIcon />}
                onClick={handleDownloadReport}
              >
                Download PDF
              </Button>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Report Content */}
            <Box
              sx={{
                bgcolor: "#f5f5f5",
                p: 3,
                borderRadius: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "Roboto, sans-serif",
                  lineHeight: 1.6,
                  fontSize: "0.95rem",
                  color: "#333",
                }}
              >
                {generatedReport}
              </Typography>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 3, display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button onClick={() => setReportModalOpen(false)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<DownloadRoundedIcon />}
                onClick={handleDownloadReport}
              >
                Download PDF
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

// ============ DOCTOR REPORT SECTION COMPONENT ============
const DoctorReportSection = ({
  doctorPatientSearch,
  setDoctorPatientSearch,
  searchPatientByAddress,
  isLoading,
  doctorPatientInfo,
  patientRecords,
  selectedRecords,
  toggleRecordSelection,
  toggleSelectAllRecords,
  reportType,
  setReportType,
  handleGenerateReport,
  reportGenerating,
  doctorConsent,
  consentExpiring,
}) => {
  return (
    <Box>
      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            Search Patient
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Enter patient wallet address (0x...)"
              value={doctorPatientSearch}
              onChange={(e) => setDoctorPatientSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchPatientByAddress()}
              disabled={isLoading}
            />
            <CustomButton
              text="Search"
              startIcon={<SearchRoundedIcon />}
              handleClick={searchPatientByAddress}
              disabled={isLoading || !doctorPatientSearch.trim()}
            />
          </Box>

          {isLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography>Verifying access and fetching records...</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Patient Info & Records */}
      {doctorPatientInfo && patientRecords.length > 0 && (
        <>
          {/* Consent Status Bar */}
          <Card sx={{ mb: 3, bgcolor: consentExpiring ? "warning.light" : "success.light" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    {consentExpiring ? (
                      <WarningRoundedIcon sx={{ color: "warning.main" }} />
                    ) : (
                      <CheckCircleRoundedIcon sx={{ color: "success.main" }} />
                    )}
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                      Patient: {doctorPatientInfo.address.substring(0, 20)}...
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                    <div>
                      <Typography variant="body2" color="textSecondary">
                        Records Available
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                        {doctorPatientInfo.recordCount}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="body2" color="textSecondary">
                        Access Valid Until
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                        {doctorPatientInfo.validUntil}
                      </Typography>
                    </div>
                  </Box>
                </div>
              </Box>
            </CardContent>
          </Card>

          {/* Consent Expiring Warning */}
          {consentExpiring && (
            <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningRoundedIcon />}>
              ⚠️ Your access to this patient's records expires within 24 hours. Please request a new
              consent from the patient soon.
            </Alert>
          )}

          {/* Records Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Patient Records ({selectedRecords.length} selected)
                </Typography>
                <Button
                  onClick={toggleSelectAllRecords}
                  size="small"
                  variant="outlined"
                >
                  {selectedRecords.length === patientRecords.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </Box>

              <List>
                {patientRecords.map((record, index) => (
                  <ListItem
                    key={record.cid}
                    onClick={() => toggleRecordSelection(record.cid)}
                    sx={{
                      bgcolor: selectedRecords.includes(record.cid)
                        ? "action.selected"
                        : "transparent",
                      borderRadius: 1,
                      mb: 1,
                      cursor: "pointer",
                      border: selectedRecords.includes(record.cid)
                        ? "2px solid"
                        : "1px solid",
                      borderColor: selectedRecords.includes(record.cid)
                        ? "primary.main"
                        : "divider",
                    }}
                  >
                    <ListItemIconButton checked={selectedRecords.includes(record.cid)} />
                    <ListItemText
                      primary={record.fileName || `Record ${index + 1}`}
                      secondary={
                        record.timestamp
                          ? new Date(parseInt(record.timestamp) * 1000).toLocaleDateString()
                          : "Unknown date"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Report Settings & Generate */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                Report Settings
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="Report Type"
                >
                  <MenuItem value="comprehensive">Comprehensive Report</MenuItem>
                  <MenuItem value="summary">Summary Report</MenuItem>
                  <MenuItem value="diagnostic">Diagnostic Analysis</MenuItem>
                </Select>
              </FormControl>

              <CustomButton
                text={reportGenerating ? "Generating Report..." : "Generate Report"}
                startIcon={<AssessmentRoundedIcon />}
                handleClick={handleGenerateReport}
                disabled={selectedRecords.length === 0 || reportGenerating}
              />

              {reportGenerating && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography>Processing records with AI...</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && patientRecords.length === 0 && doctorPatientInfo && (
        <Alert severity="info" icon={<InfoRoundedIcon />}>
          ✓ Access Granted! Patient has not uploaded any records yet. Check back later or ask the
          patient to upload their medical records.
        </Alert>
      )}

      {!doctorPatientInfo && !isLoading && !doctorPatientSearch && (
        <Card sx={{ p: 3, textAlign: "center", bgcolor: "action.hover" }}>
          <SearchRoundedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
          <Typography variant="body1" color="textSecondary">
            Enter a patient wallet address and click Search to begin generating reports
          </Typography>
        </Card>
      )}
    </Box>
  );
};

// ============ PATIENT REPORT SECTION COMPONENT ============
const PatientReportSection = ({
  patientOwnRecords,
  patientProfile,
  reportType,
  setReportType,
  handleGenerateReport,
  reportGenerating,
  isLoading,
}) => {
  return (
    <Box>
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : patientOwnRecords.length === 0 ? (
        <Alert severity="info" icon={<WarningRoundedIcon />}>
          You have no medical records yet. Upload your first record to generate a report.
        </Alert>
      ) : (
        <>
          {/* Patient Profile Summary */}
          <Card sx={{ mb: 3, bgcolor: "info.light" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Your Medical Profile
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {patientProfile.name || "Not set"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Age
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {patientProfile.age || "Not set"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Blood Group
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {patientProfile.bloodGroup || "Not set"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Allergies
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {patientProfile.allergies || "None"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Your Records */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                Your Medical Records ({patientOwnRecords.length})
              </Typography>

              <List>
                {patientOwnRecords.map((record, index) => (
                  <ListItem
                    key={record.cid}
                    sx={{
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      mb: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <ListItemIcon>
                      <StorageRoundedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={record.fileName || `Record ${index + 1}`}
                      secondary={
                        record.timestamp
                          ? new Date(parseInt(record.timestamp) * 1000).toLocaleDateString()
                          : "Unknown date"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Report Settings */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                Generate Your Health Report
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="Report Type"
                >
                  <MenuItem value="comprehensive">Comprehensive Report</MenuItem>
                  <MenuItem value="summary">Summary Report</MenuItem>
                  <MenuItem value="diagnostic">Diagnostic Analysis</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {patientOwnRecords.length} record(s) will be included in the report
              </Typography>

              <CustomButton
                text={reportGenerating ? "Generating Report..." : "Generate My Report"}
                startIcon={<AssessmentRoundedIcon />}
                handleClick={handleGenerateReport}
                disabled={reportGenerating}
              />

              {reportGenerating && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography>AI is analyzing your records...</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

// ============ HELPER COMPONENT ============
const ListItemIconButton = ({ checked }) => (
  <ListItemIcon sx={{ minWidth: 40 }}>
    {checked ? (
      <CheckCircleRoundedIcon sx={{ color: "primary.main" }} />
    ) : (
      <Box
        sx={{
          width: 24,
          height: 24,
          border: "2px solid",
          borderColor: "divider",
          borderRadius: "50%",
        }}
      />
    )}
  </ListItemIcon>
);

export default Reports;
