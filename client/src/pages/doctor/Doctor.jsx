import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  Modal,
  TextField,
  Typography,
  Backdrop,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
<<<<<<< main
  Button,
=======
  Fade,
>>>>>>> main
} from "@mui/material";
import CustomButton from "../../components/CustomButton";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import NoteAddRoundedIcon from '@mui/icons-material/NoteAddRounded';
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import useEth from "../../contexts/EthContext/useEth";
import useAlert from "../../contexts/AlertContext/useAlert";
import AddRecordModal from "./AddRecordModal";
import uploadToIPFS from "../../ipfs";
import Record from "../../components/Record";

const Doctor = () => {
  const {
    state: { contract, accounts, role, loading },
  } = useEth();
  const { setAlert } = useAlert();

  // ============ LEVEL 1 STATE (Always available) ============
  const [searchInput, setSearchInput] = useState("");
  const [addPatientAddress, setAddPatientAddress] = useState("");
  const [recentPatients, setRecentPatients] = useState(() => {
    const saved = localStorage.getItem("recentPatients");
    return saved ? JSON.parse(saved) : [];
  });
  const [dashboardStats, setDashboardStats] = useState({
    totalRecords: 0,
    recentActivities: []
  });

  // ============ LEVEL 2 STATE (After patient selected) ============
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientExists, setPatientExists] = useState(false);
  const [consent, setConsent] = useState(null);
  const [consentExpiring, setConsentExpiring] = useState(false);

  // ============ LEVEL 3 STATE (After records fetched) ============
  const [records, setRecords] = useState([]);
  const [consentHistory, setConsentHistory] = useState([]);
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // ============ UI & INTERACTION STATE ============
  const [addRecordModalOpen, setAddRecordModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // ============ FETCH DASHBOARD STATS (LEVEL 1) ============
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!contract || !accounts?.length || role !== "doctor") return;
      try {
        const allRecordEvents = await contract.getPastEvents('RecordAdded', {
          fromBlock: 0,
          toBlock: 'latest'
        });
        const myRecordEvents = allRecordEvents.filter(e => e.returnValues.doctorId.toLowerCase() === accounts[0].toLowerCase());
        
        const consentEvents = await contract.getPastEvents('ConsentUpdated', {
          fromBlock: 0,
          toBlock: 'latest'
        });
        const myConsentEvents = consentEvents.filter(e => e.returnValues.doctorId.toLowerCase() === accounts[0].toLowerCase());

        let activities = [
          ...myRecordEvents.map(e => ({ type: 'Record Uploaded', patient: e.returnValues.patientId, blockNumber: e.blockNumber })),
          ...myConsentEvents.map(e => ({ type: `Consent ${e.returnValues.action}`, patient: e.returnValues.patientId, blockNumber: e.blockNumber }))
        ];
        
        activities.sort((a, b) => b.blockNumber - a.blockNumber);
        
        setDashboardStats({
          totalRecords: myRecordEvents.length,
          recentActivities: activities.slice(0, 5)
        });
      } catch (err) {
        console.error("Failed to fetch dashboard events", err);
      }
    };
    fetchDashboardData();
  }, [contract, accounts, role]);

  // ============ SEARCH PATIENT (LEVEL 2 TRANSITION) ============
  const searchPatient = async (addressOverride) => {
    const targetAddress = typeof addressOverride === 'string' ? addressOverride : searchInput;
    
    if (!contract || !accounts?.length) {
      setAlert("Connect MetaMask and ensure the contract is deployed on this network.", "error");
      return;
    }
    
    if (!/^(0x)?[0-9a-f]{40}$/i.test(targetAddress)) {
      setAlert("Please enter a valid wallet address", "error");
      return;
    }

    setIsSearching(true);
    try {
      const exists = await contract.methods
        .getPatientExists(targetAddress)
        .call({ from: accounts[0] });

      if (!exists) {
        setAlert("Patient does not exist in the system", "error");
        setSelectedPatient(null);
        setPatientExists(false);
        setRecords([]);
        setConsent(null);
        setIsSearching(false);
        return;
      }

      // Patient exists - Level 2 unlock
      setSelectedPatient(targetAddress);
      setPatientExists(true);

      // Fetch consent info
      try {
        const consentData = await contract.methods.patientConsents(targetAddress, accounts[0]).call();
        setConsent(consentData);
        
        if (consentData.isAuthorized) {
          const validUntilMs = Number(consentData.validUntil) * 1000;
          const timeDiff = validUntilMs - Date.now();
          setConsentExpiring(timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000);
        }
      } catch (e) {
        console.error("Could not fetch consent info", e);
        setConsent(null);
      }

      // Try to fetch records - Level 3 unlock
      try {
        const recs = await contract.methods
          .getRecords(targetAddress)
          .call({ from: accounts[0] });
        setRecords(recs || []);

        // Fetch consent history if records exist
        try {
          const history = await contract.methods.getConsentHistory(targetAddress).call({ from: accounts[0] });
          setConsentHistory(history || []);
        } catch (e) {
          console.error("Could not fetch consent history", e);
          setConsentHistory([]);
        }
      } catch (recordErr) {
        console.error("Auth error fetching records:", recordErr);
        setRecords([]);
        setConsentHistory([]);
      }

      // Add to recent patients
      setRecentPatients(prev => {
        const updated = [targetAddress, ...prev.filter(a => a !== targetAddress)].slice(0, 5);
        localStorage.setItem("recentPatients", JSON.stringify(updated));
        return updated;
      });

      if (targetAddress !== searchInput) {
        setSearchInput(targetAddress);
      }
    } catch (err) {
      console.error(err);
      setAlert(err?.message || "Could not search for patient. Check the network and try again.", "error");
      setSelectedPatient(null);
      setPatientExists(false);
    } finally {
      setIsSearching(false);
    }
  };

  // ============ REGISTER PATIENT (LEVEL 1) ============
  const registerPatient = async () => {
    if (!contract || !accounts?.length) {
      setAlert("Connect MetaMask and ensure the contract is deployed on this network.", "error");
      return;
    }
    if (!/^(0x)?[0-9a-f]{40}$/i.test(addPatientAddress)) {
      setAlert("Please enter a valid wallet address", "error");
      return;
    }
    try {
      await contract.methods
        .addPatient(addPatientAddress)
        .send({ from: accounts[0] });
      setAlert("Patient registered successfully", "success");
      setAddPatientAddress("");
    } catch (err) {
      console.error(err);
      setAlert("Patient registration failed", "error");
    }
  };

  // ============ REQUEST ACCESS (LEVEL 2) ============
  const requestAccess = (patientAddress) => {
    const key = `accessRequests_${patientAddress.toLowerCase()}`;
    const existing = JSON.parse(localStorage.getItem(key)) || [];
    
    if (existing.some(req => req.doctorId.toLowerCase() === accounts[0].toLowerCase())) {
        setAlert("You have already sent an access request to this patient.", "info");
        return;
    }
    
    existing.push({
      doctorId: accounts[0],
      timestamp: Date.now(),
      status: "pending"
    });
    localStorage.setItem(key, JSON.stringify(existing));
    setAlert("Access request sent to the patient's portal successfully!", "success");
  };

  // ============ ADD RECORD (LEVEL 3) ============
  const addRecordCallback = useCallback(
    async (buffer, fileName, patientAddress, metadataStr) => {
      if (!patientAddress) {
        setAlert("Please search for a patient first", "error");
        return;
      }
      try {
        const ipfsHash = await uploadToIPFS(buffer, fileName);
        if (ipfsHash) {
          await contract.methods
            .addRecord(ipfsHash, fileName, patientAddress, metadataStr)
            .send({ from: accounts[0] });
          setAlert("New record uploaded and secured on blockchain", "success");
          setAddRecordModalOpen(false);
          
          // Refresh records
          const recs = await contract.methods
            .getRecords(patientAddress)
            .call({ from: accounts[0] });
          setRecords(recs || []);
        }
      } catch (err) {
        console.error(err);
        setAlert("Record upload failed. Check console for details.", "error");
      }
    },
    [accounts, contract, setAlert]
  );

  // ============ PROCESS RECORDS BY FILTER & SORT (LEVEL 3) ============
  const processedRecords = React.useMemo(() => {
    let result = [...records];

    if (filterCategory !== "All") {
      result = result.filter(rec => {
        try {
          const meta = JSON.parse(rec.metadata);
          return meta.category?.toLowerCase() === filterCategory.toLowerCase();
        } catch (e) {
          return false;
        }
      });
    }

    result.sort((a, b) => {
      const timeA = Number(a.timeAdded);
      const timeB = Number(b.timeAdded);
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [records, filterCategory, sortOrder]);

  const availableCategories = React.useMemo(() => {
    const cats = new Set();
    records.forEach(rec => {
      if (rec.metadata) {
        try {
          const meta = JSON.parse(rec.metadata);
          if (meta.category) cats.add(meta.category);
        } catch (e) { }
      }
    });
    return Array.from(cats);
  }, [records]);

  // ============ GUARD CLAUSES ============
  if (loading) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  if (!accounts?.length) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <Typography variant="h6">
          Open your MetaMask wallet to get connected, then refresh this page
        </Typography>
      </Box>
    );
  }

  if (!contract) {
    return (
      <Box display="flex" justifyContent="center" mt={5} px={2}>
        <Typography variant="h6" textAlign="center">
          No EHR contract on this network. Deploy with Truffle on the chain MetaMask is using, then
          refresh.
        </Typography>
      </Box>
    );
  }

  if (role === "unknown") {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <Typography variant="h5">
          You're not registered, please go to home page
        </Typography>
      </Box>
    );
  }

  if (role === "patient") {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <Typography variant="h5">Only doctor can access this page</Typography>
      </Box>
    );
  }

  // ============ RETURN JSX WITH PROGRESSIVE DISCLOSURE ============
  return (
    <Box display="flex" justifyContent="center" width="100%" sx={{ py: 1 }}>
      <Box width={{ xs: "100%", md: "90%" }}>
        {/* ===== MODAL ===== */}
        <Modal open={addRecordModalOpen} onClose={() => setAddRecordModalOpen(false)}>
          <AddRecordModal
            handleClose={() => setAddRecordModalOpen(false)}
            handleUpload={addRecordCallback}
            patientAddress={selectedPatient}
          />
        </Modal>

<<<<<<< main
=======
        {/* ===== LEVEL 1: ALWAYS VISIBLE ===== */}
        <Typography variant="h4" sx={{ color: 'teal', mb: 3, fontWeight: 'bold' }}>
          Doctor Dashboard
        </Typography>

        {/* Dashboard Stats + Recent Activity */}
>>>>>>> main
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Stats Card */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', background: '#0f766e', color: 'white', borderRadius: 4, boxShadow: '0 10px 25px rgba(15, 118, 110, 0.3)' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', p: { xs: 3, md: 4 } }}>
                <Box>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500, mb: 2 }}>
                    Total Records Uploaded
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '4.5rem', lineHeight: 1 }}>
                    {dashboardStats.totalRecords}
                  </Typography>
                </Box>
                <AssessmentRoundedIcon sx={{ fontSize: 90, opacity: 0.8 }} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid #14b8a6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ background: '#14b8a6', color: 'white', py: 1.5, px: 2.5 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Activity
                </Typography>
              </Box>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <List sx={{ pt: 0, pb: 0, flexGrow: 1 }}>
                  {dashboardStats.recentActivities.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
                      No recent on-chain activity found.
                    </Typography>
                  ) : (
                    dashboardStats.recentActivities.map((act, i) => (
                      <React.Fragment key={i}>
                        <ListItem sx={{ px: 2.5, py: 1.5 }}>
                          <ListItemIcon sx={{ minWidth: 44 }}>
                            <Box sx={{ 
                              bgcolor: act.type.includes('Record') ? '#e0f2fe' : (act.type.includes('Granted') ? '#dcfce7' : '#f3f4f6'), 
                              p: 1.2, 
                              borderRadius: '50%',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              {act.type.includes('Record') ? <NoteAddRoundedIcon fontSize="small" sx={{ color: '#0284c7' }} /> : <VpnKeyRoundedIcon fontSize="small" sx={{ color: act.type.includes('Granted') ? "#16a34a" : "#64748b" }} />}
                            </Box>
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Typography variant="body1" fontWeight={600} color="text.primary">
                                {act.type}
                              </Typography>
                            } 
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                Patient: {`${act.patient.substring(0,6)}...${act.patient.substring(act.patient.length-4)}`} - Block {act.blockNumber}
                              </Typography>
                            } 
                          />
                        </ListItem>
                        {i < dashboardStats.recentActivities.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search Patient Card - LEVEL 1 */}
        <Card sx={{
          mb: 4,
          background: "#eefaf6",
          borderRadius: 3,
          border: '1px solid #ccf0e6',
          boxShadow: 'none'
        }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h4" mb={1} fontWeight={800} color="#0f172a">
              Search Patient Records
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569', mb: 3, maxWidth: 600 }}>
              Find a patient by wallet address to review records and upload new files.
            </Typography>

            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} alignItems="stretch" gap={2}>
              <FormControl fullWidth>
                <TextField
                  variant="outlined"
<<<<<<< main
                  placeholder="Patient wallet address"
                  value={searchPatientAddress}
                  onChange={(e) => setSearchPatientAddress(e.target.value)}
                  size="medium"
=======
                  label="Patient wallet address"
                  placeholder="0x..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  size="small"
                  disabled={isSearching}
>>>>>>> main
                  sx={{
                    bgcolor: 'white',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': { borderColor: '#cbd5e1' },
                      '&:hover fieldset': { borderColor: '#94a3b8' },
                      '&.Mui-focused fieldset': { borderColor: '#0f766e', borderWidth: 2 },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#94a3b8',
                      opacity: 1,
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <SearchRoundedIcon sx={{ color: '#94a3b8', mr: 1 }} />
                    ),
                  }}
                />
              </FormControl>

<<<<<<< main
              <Button 
                variant="contained" 
                onClick={searchPatient}
                sx={{ 
                  backgroundColor: '#0f766e', 
                  color: 'white', 
                  px: 4,
                  fontSize: '1rem',
                  borderRadius: 2,
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    backgroundColor: '#0b504b',
                    boxShadow: 'none',
                  }
                }}
              >
                Search
              </Button>

              {patientExist && (
                <Chip label="Patient Found" color="success" sx={{ alignSelf: 'center', height: 48, borderRadius: 2, px: 1, fontWeight: 600 }} />
=======
              <CustomButton 
                text={isSearching ? "Searching..." : "Search"} 
                handleClick={searchPatient}
                disabled={isSearching}
              >
                <SearchRoundedIcon style={{ color: "white" }} />
              </CustomButton>

              {patientExists && (
                <Chip label="Patient Found" color="success" variant="outlined" sx={{ color: "white", borderColor: "white", height: 40 }} />
>>>>>>> main
              )}
            </Box>

            {/* Recent Patients */}
            {recentPatients.length > 0 && (
              <Box mt={4}>
                <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, mb: 1.5 }}>
                  Recent Patients:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1.5}>
                  {recentPatients.map((addr) => (
                    <Chip
                      key={addr}
                      label={`${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`}
                      clickable
                      onClick={() => searchPatient(addr)}
                      sx={{
                        backgroundColor: "white",
                        color: "#334155",
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        px: 1,
                        py: 2.2,
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: "#f1f5f9",
                          borderColor: '#94a3b8'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Register Patient Card - LEVEL 1 */}
        <Card sx={{
          mb: 3,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
        }}>
          <CardContent>
            <Typography variant="h5" mb={1.5}>
              Register New Patient
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mb: 3 }}>
              Add a new patient wallet so they can receive records on-chain.
            </Typography>

            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "flex-end" }} gap={2}>
              <FormControl fullWidth>
                <TextField
                  variant="outlined"
                  label="Patient wallet address"
                  placeholder="0x..."
                  value={addPatientAddress}
                  onChange={(e) => setAddPatientAddress(e.target.value)}
                  size="small"
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      borderRadius: 1,
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'rgba(255,255,255,0.7)',
                      opacity: 1,
                    },
                    "& .MuiInputLabel-root": {
                      color: "rgba(255,255,255,0.8)",
                    },
                  }}
                />
              </FormControl>

              <CustomButton text="Register" handleClick={registerPatient}>
                <PersonAddAlt1RoundedIcon style={{ color: "white" }} />
              </CustomButton>
            </Box>
          </CardContent>
        </Card>

        {/* ===== LEVEL 2: AFTER PATIENT SELECTED ===== */}
        {patientExists && (
          <Fade in={patientExists} timeout={400}>
            <Box>
              {/* Patient Header & Consent Status */}
              <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', border: '2px solid #0ea5e9' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0f766e', mb: 0.5 }}>
                        Selected Patient
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', fontFamily: 'monospace' }}>
                        {selectedPatient}
                      </Typography>
                    </Box>

                    {/* Consent Status */}
                    <Box display="flex" alignItems="center" gap={1}>
                      {consent?.isAuthorized ? (
                        <Chip
                          icon={<VerifiedUserRoundedIcon />}
                          label={consentExpiring ? "⚠️ Expiring Soon" : "✓ Access Granted"}
                          sx={{
                            background: consentExpiring 
                              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<LockRoundedIcon />}
                          label="❌ No Access"
                          sx={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Consent Warning Banner - Only if active & expiring */}
              {consent?.isAuthorized && consentExpiring && (
                <Fade in={consentExpiring} timeout={400}>
                  <Alert severity="warning" sx={{ mb: 3, fontSize: '1rem' }} icon={<InfoRoundedIcon />}>
                    <strong>Consent Expiring Soon</strong> - This patient's access will expire within 24 hours. Request renewal from the patient.
                  </Alert>
                </Fade>
              )}

              {/* No Access Card */}
              {!consent?.isAuthorized && (
                <Fade in={!consent?.isAuthorized} timeout={400}>
                  <Card sx={{ mb: 3, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                      <LockRoundedIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
                      <Typography variant="h5" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Access Denied
                      </Typography>
                      <Typography variant="body1" color="textSecondary" textAlign="center" mb={3} maxWidth={500}>
                        You do not currently have consent to view this patient's records. Send an access request and wait for the patient to grant permission.
                      </Typography>
                      <CustomButton text="Send Access Request" handleClick={() => requestAccess(selectedPatient)}>
                        <SendRoundedIcon style={{ color: "white" }} />
                      </CustomButton>
                    </CardContent>
                  </Card>
                </Fade>
              )}

              {/* ===== LEVEL 3: AFTER RECORDS LOADED ===== */}
              {consent?.isAuthorized && (
                <Fade in={true} timeout={400}>
                  <Box>
                    {/* Records Header with Filter & Upload */}
                    <Card sx={{ mb: 3 }}>
                      <CardContent>
                        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Medical Records {records.length > 0 && `(${records.length})`}
                          </Typography>
                          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                            {records.length > 0 && (
                              <>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                  <InputLabel>Category</InputLabel>
                                  <Select
                                    value={filterCategory}
                                    label="Category"
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                  >
                                    <MenuItem value="All">All Categories</MenuItem>
                                    {availableCategories.map(cat => (
                                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>

                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                  <InputLabel>Sort By</InputLabel>
                                  <Select
                                    value={sortOrder}
                                    label="Sort By"
                                    onChange={(e) => setSortOrder(e.target.value)}
                                  >
                                    <MenuItem value="newest">Newest First</MenuItem>
                                    <MenuItem value="oldest">Oldest First</MenuItem>
                                  </Select>
                                </FormControl>
                              </>
                            )}
                            <CustomButton text="+ New Record" handleClick={() => setAddRecordModalOpen(true)}>
                              <CloudUploadRoundedIcon style={{ color: "white" }} />
                            </CustomButton>
                          </Box>
                        </Box>

                        {records.length === 0 ? (
                          // Empty state for Level 3
                          <Box display="flex" justifyContent="center" flexDirection="column" alignItems="center" py={6}>
                            <CloudUploadRoundedIcon sx={{ fontSize: 64, color: 'rgba(0,121,107,0.3)', mb: 2 }} />
                            <Typography variant="h6" color="textSecondary" gutterBottom>
                              No records yet
                            </Typography>
                            <Typography variant="body2" color="textSecondary" textAlign="center" maxWidth={400} mb={3}>
                              This patient doesn't have any medical records on file. Upload the first record to get started.
                            </Typography>
                            <CustomButton text="Upload First Record" handleClick={() => setAddRecordModalOpen(true)}>
                              <CloudUploadRoundedIcon style={{ color: "white" }} />
                            </CustomButton>
                          </Box>
                        ) : (
                          // Records list
                          <Box display="flex" flexDirection="column" gap={2}>
                            {processedRecords.length === 0 ? (
                              <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                No records match the selected filter.
                              </Typography>
                            ) : (
                              processedRecords.map((record, index) => (
                                <Box key={index}>
                                  <Record record={record} />
                                </Box>
                              ))
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Fade>
              )}
            </Box>
          </Fade>
        )}

        {/* Onboarding Message - When no patient selected */}
        {!patientExists && (
          <Fade in={!patientExists} timeout={400}>
            <Card sx={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '2px dashed #0ea5e9', mt: 4 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <InfoRoundedIcon sx={{ fontSize: 64, color: '#0ea5e9', mb: 2, opacity: 0.7 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0369a1', mb: 1 }}>
                  Get Started
                </Typography>
                <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={500}>
                  Search for a patient above to view and manage their medical records. Use your patient list to quickly access frequently reviewed records.
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        )}
      </Box>
    </Box>
  );
};

export default Doctor;
