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

  const [patientExist, setPatientExist] = useState(false);
  const [searchPatientAddress, setSearchPatientAddress] = useState("");
  const [addPatientAddress, setAddPatientAddress] = useState("");
  const [records, setRecords] = useState([]);
  const [addRecord, setAddRecord] = useState(false);

  const [recentPatients, setRecentPatients] = useState(() => {
    const saved = localStorage.getItem("recentPatients");
    return saved ? JSON.parse(saved) : [];
  });
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [consentWarning, setConsentWarning] = useState(null);

  const [authError, setAuthError] = useState(false);
  const [patientFoundAddress, setPatientFoundAddress] = useState("");

  const [dashboardStats, setDashboardStats] = useState({
    totalRecords: 0,
    recentActivities: []
  });

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
          recentActivities: activities.slice(0, 5) // top 5
        });
      } catch (err) {
        console.error("Failed to fetch dashboard events", err);
      }
    };
    fetchDashboardData();
  }, [contract, accounts, role]);

  const searchPatient = async (addressOverride) => {
    const targetAddress = typeof addressOverride === 'string' ? addressOverride : searchPatientAddress;
    if (!contract || !accounts?.length) {
      setAlert("Connect MetaMask and ensure the contract is deployed on this network.", "error");
      return;
    }
    if (!/^(0x)?[0-9a-f]{40}$/i.test(targetAddress)) {
      setAlert("Please enter a valid wallet address", "error");
      return;
    }
    try {
      const exists = await contract.methods
        .getPatientExists(targetAddress)
        .call({ from: accounts[0] });
      if (exists) {
        setPatientFoundAddress(targetAddress);
        try {
          const recs = await contract.methods
            .getRecords(targetAddress)
            .call({ from: accounts[0] });
          setRecords(recs);
          setPatientExist(true);
          setAuthError(false);
          if (targetAddress !== searchPatientAddress) {
            setSearchPatientAddress(targetAddress);
          }

          try {
            const consent = await contract.methods.patientConsents(targetAddress, accounts[0]).call();
            if (consent && consent.isAuthorized) {
              const validUntil = Number(consent.validUntil) * 1000;
              const timeDiff = validUntil - Date.now();
              if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
                setConsentWarning(`Access to this patient's records expires in ${Math.round(timeDiff / (60 * 60 * 1000))} hours.`);
              } else {
                setConsentWarning(null);
              }
            }
          } catch (e) {
            console.error("Could not fetch consent expiry , you ,Request for access");
          }
        } catch (authErr) {
          console.error("Auth error:", authErr);
          setPatientExist(false);
          setAuthError(true);
          setRecords([]);
        }

        setRecentPatients(prev => {
          const updated = [targetAddress, ...prev.filter(a => a !== targetAddress)].slice(0, 5);
          localStorage.setItem("recentPatients", JSON.stringify(updated));
          return updated;
        });
      } else {
        setAlert("Patient does not exist", "error");
        setPatientExist(false);
        setAuthError(false);
        setRecords([]);
        setConsentWarning(null);
      }
    } catch (err) {
      console.error(err);
      setAlert(err?.message || "Could not search for patient. Check the network and try again.", "error");
    }
  };

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
          setAddRecord(false);
          const recs = await contract.methods
            .getRecords(patientAddress)
            .call({ from: accounts[0] });
          setRecords(recs);
        }
      } catch (err) {
        console.error(err);
        setAlert("Record upload failed. Check console for details.", "error");
      }
    },
    [accounts, contract, setAlert]
  );

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

  return (
    <Box display="flex" justifyContent="center" width="100%" sx={{ py: 1 }}>
      <Box width={{ xs: "100%", md: "90%" }}>
        <Modal open={addRecord} onClose={() => setAddRecord(false)}>
          <AddRecordModal
            handleClose={() => setAddRecord(false)}
            handleUpload={addRecordCallback}
            patientAddress={searchPatientAddress}
          />
        </Modal>

        <Typography variant="h4" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
          Doctor Dashboard
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Stats Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', color: 'white' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <AssessmentRoundedIcon sx={{ fontSize: 48, opacity: 0.8, mb: 1 }} />
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {dashboardStats.totalRecords}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Total Records Uploaded
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Feed Card */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <HistoryRoundedIcon color="primary" />
                  <Typography variant="h6">
                    Recent Activity
                  </Typography>
                </Box>
                <Divider />
                <List sx={{ pt: 0, pb: 0 }}>
                  {dashboardStats.recentActivities.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
                      No recent on-chain activity found.
                    </Typography>
                  ) : (
                    dashboardStats.recentActivities.map((act, i) => (
                      <React.Fragment key={i}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {act.type.includes('Record') ? <NoteAddRoundedIcon color="secondary" /> : <VpnKeyRoundedIcon color={act.type.includes('Granted') ? "success" : "error"} />}
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Typography variant="subtitle2">
                                {act.type}
                              </Typography>
                            } 
                            secondary={`Patient: ${act.patient.substring(0,6)}...${act.patient.substring(act.patient.length-4)}`} 
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

        <Card sx={{
          mb: 3,
          background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
          color: "white",
        }}>
          <CardContent>
            <Typography variant="h5" mb={1.5}>
              Search Patient Records
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 3 }}>
              Find a patient by wallet address to review records and upload new files.
            </Typography>

            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "flex-end" }} gap={2}>
              <FormControl fullWidth>
                <TextField
                  variant="outlined"
                  label="Patient wallet address"
                  placeholder="0x..."
                  value={searchPatientAddress}
                  onChange={(e) => setSearchPatientAddress(e.target.value)}
                  size="small"
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      borderRadius: 2,
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

              <CustomButton text="Search" handleClick={searchPatient}>
                <SearchRoundedIcon style={{ color: "white" }} />
              </CustomButton>

              {patientExist && (
                <Chip label="Patient Found" color="success" variant="outlined" sx={{ color: "white", borderColor: "white", height: 40 }} />
              )}
            </Box>

            {recentPatients.length > 0 && (
              <Box mt={3}>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
                  Recent Patients:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {recentPatients.map((addr) => (
                    <Chip
                      key={addr}
                      label={`${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`}
                      clickable
                      onClick={() => searchPatient(addr)}
                      sx={{
                        color: "white",
                        backgroundColor: "rgba(255,255,255,0.1)",
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: "rgba(255,255,255,0.25)",
                          transform: "translateY(-1px)"
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {authError && patientFoundAddress && !patientExist && (
          <Card sx={{ mb: 3, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
              <LockRoundedIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
              <Typography variant="h5" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                Access Denied
              </Typography>
              <Typography variant="body1" color="textSecondary" textAlign="center" mb={3} maxWidth={500}>
                This patient exists in the system, but you do not currently have the required consent to view their medical records, or your previous consent has expired.
              </Typography>
              <CustomButton text="Send Access Request" handleClick={() => requestAccess(patientFoundAddress)}>
                <SendRoundedIcon style={{ color: "white" }} />
              </CustomButton>
            </CardContent>
          </Card>
        )}

        {patientExist && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {consentWarning && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  {consentWarning}
                </Alert>
              )}
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
                <Typography variant="h6">
                  Patient Records ({records.length})
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
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
                  <CustomButton text="+ New Record" handleClick={() => setAddRecord(true)}>
                    <CloudUploadRoundedIcon style={{ color: "white" }} />
                  </CustomButton>
                </Box>
              </Box>

              {records.length === 0 ? (
                <Box display="flex" justifyContent="center" py={5}>
                  <Typography variant="body1" color="text.secondary">
                    No records found for this patient
                  </Typography>
                </Box>
              ) : (
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
        )}

        <Card sx={{
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
      </Box>
    </Box>
  );
};

export default Doctor;
