import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Card, CardContent, Typography, Backdrop, CircularProgress,
  TextField, MenuItem, Select, FormControl, InputLabel, Button,
  Grid, Dialog, DialogTitle, DialogContent, IconButton, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, Divider, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip,
  Modal
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import useEth from "../../contexts/EthContext/useEth";
import Record from "../../components/Record";
import uploadToIPFS from "../../ipfs";
import AddRecordModal from "../doctor/AddRecordModal";

const Patient = () => {
  const {
    state: { contract, accounts, role, loading },
  } = useEth();

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Profile State
  const [profile, setProfile] = useState({ name: "", age: "", bloodGroup: "", allergies: "" });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Filter & Search & Preview State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [previewData, setPreviewData] = useState({ open: false, cid: "", name: "" });

  // Consent Management State
  const [consents, setConsents] = useState([]);
  const [consentHistory, setConsentHistory] = useState([]);
  const [grantAddress, setGrantAddress] = useState("");
  const [grantPurpose, setGrantPurpose] = useState("Consultation");
  const [grantDuration, setGrantDuration] = useState(86400); // Default 1 Day
  const [managingConsent, setManagingConsent] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);

  // ===== SELF-UPLOAD FEATURE STATE =====
  const [addRecordModalOpen, setAddRecordModalOpen] = useState(false);

  const loadRequests = useCallback(() => {
    if (!accounts?.length) return;
    const key = `accessRequests_${accounts[0].toLowerCase()}`;
    setPendingRequests(JSON.parse(localStorage.getItem(key)) || []);
  }, [accounts]);

  useEffect(() => {
    loadRequests();
    const handleStorage = () => loadRequests();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadRequests]);

  useEffect(() => {
    if (!contract || !accounts?.length) {
      setLoadingRecords(false);
      return;
    }

    let cancelled = false;
    setLoadingRecords(true);

    const savedProfile = localStorage.getItem(`profile_${accounts[0]}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }

    const fetchData = async () => {
      try {
        const recs = await contract.methods.getRecords(accounts[0]).call({ from: accounts[0] });
        const currentConsents = await contract.methods.getConsentedDoctors(accounts[0]).call({ from: accounts[0] });
        const historyLogs = await contract.methods.getConsentHistory(accounts[0]).call({ from: accounts[0] });
        
        if (!cancelled) {
          setRecords(recs);
          setConsents(currentConsents);
          setConsentHistory(historyLogs);
        }
      } catch (err) {
        console.error("Error fetching EHR data:", err);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [contract, accounts, managingConsent]);

  const handleSaveProfile = () => {
    if (accounts?.length) {
      localStorage.setItem(`profile_${accounts[0]}`, JSON.stringify(profile));
    }
    setIsEditingProfile(false);
  };

  const handlePreview = (cid, name) => {
    setPreviewData({ open: true, cid, name });
  };
  const closePreview = () => {
    setPreviewData({ open: false, cid: "", name: "" });
  };

  // --- Consent Functions ---
  const handleGrantAccess = async () => {
    if (!grantAddress || !/^(0x)?[0-9a-f]{40}$/i.test(grantAddress)) {
      alert("Please enter a valid Doctor Ethereum address");
      return;
    }
    setLoadingRecords(true);
    try {
      await contract.methods.grantAccess(grantAddress, grantPurpose, grantDuration).send({ from: accounts[0] });
      setGrantAddress("");
      setManagingConsent(prev => !prev); // triggers re-fetch
    } catch (err) {
      console.error(err);
      alert("Failed to grant access. Ensure they are a registered doctor.");
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleRevokeAccess = async (doctorId) => {
    setLoadingRecords(true);
    try {
      await contract.methods.revokeAccess(doctorId).send({ from: accounts[0] });
      setManagingConsent(prev => !prev);
    } catch (err) {
      console.error(err);
      alert("Failed to revoke access.");
    } finally {
      setLoadingRecords(false);
    }
  };

  const approveRequest = async (docId) => {
    setLoadingRecords(true);
    try {
      await contract.methods.grantAccess(docId, "Requested Access", 86400).send({ from: accounts[0] });
      const key = `accessRequests_${accounts[0].toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(key)) || [];
      const updated = existing.filter(req => req.doctorId.toLowerCase() !== docId.toLowerCase());
      localStorage.setItem(key, JSON.stringify(updated));
      loadRequests();
      setManagingConsent(prev => !prev);
    } catch (err) {
      console.error(err);
      alert("Failed to grant access.");
    } finally {
      setLoadingRecords(false);
    }
  };

  const denyRequest = (docId) => {
    const key = `accessRequests_${accounts[0].toLowerCase()}`;
    const existing = JSON.parse(localStorage.getItem(key)) || [];
    const updated = existing.filter(req => req.doctorId.toLowerCase() !== docId.toLowerCase());
    localStorage.setItem(key, JSON.stringify(updated));
    loadRequests();
  };

  // ===== SELF-UPLOAD FUNCTIONS =====
  const handleAddRecordUpload = useCallback(
    async (buffer, fileName, patientAddress, metadataStr) => {
      try {
        const ipfsHash = await uploadToIPFS(buffer, fileName);
        if (ipfsHash) {
          // Use addRecordAsSelf instead of addRecord
          await contract.methods
            .addRecordAsSelf(ipfsHash, fileName, metadataStr)
            .send({ from: accounts[0] });

          alert("Your record has been uploaded successfully!");
          setAddRecordModalOpen(false);
          
          // Refresh records
          setManagingConsent(prev => !prev);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to upload record: " + err.message);
      }
    },
    [accounts, contract]
  );

  // --- Status Screens ---
  if (loading) return <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}><CircularProgress color="inherit" /></Backdrop>;
  if (loadingRecords) return <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingRecords}><CircularProgress color="inherit" /></Backdrop>;
  if (!accounts?.length) return <Box display="flex" justifyContent="center" mt={5}><Typography variant="h6">Open your MetaMask wallet to connect</Typography></Box>;
  if (!contract) return <Box display="flex" justifyContent="center" mt={5} px={2}><Typography variant="h6">No EHR contract found. Truffle migrate needed.</Typography></Box>;
  if (role === "unknown") return <Box display="flex" justifyContent="center" mt={5}><Typography variant="h5">You are not registered.</Typography></Box>;
  if (role === "doctor") return <Box display="flex" justifyContent="center" mt={5}><Typography variant="h5">Only patient can access this page.</Typography></Box>;

  // --- Calculations ---
  const filteredRecords = records
    .filter((r) => r[1].toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const timeA = parseInt(a[4]);
      const timeB = parseInt(b[4]);
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  const totalRecords = records.length;
  const activeDoctorsCount = new Set(records.map(r => r[3])).size;
  const latestVisitStr = records.length > 0 
    ? new Date(Math.max(...records.map(r => parseInt(r[4]) * 1000))).toLocaleDateString() 
    : "N/A";

  const reversedHistory = [...consentHistory].reverse();

  return (
    <Box display="flex" justifyContent="center" width="100%" sx={{ py: 4, px: 2, backgroundColor: 'transparent' }}>
      <Box width={{ xs: "100%", lg: "85%" }}>

        {pendingRequests.length > 0 && (
          <Card sx={{ mb: 3, border: "1px solid #f59e0b", background: "#fffbeb", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#d97706", mb: 2 }}>
                Pending Doctor Access Requests ({pendingRequests.length})
              </Typography>
              <List disablePadding>
                {pendingRequests.map((req, i) => (
                  <ListItem key={i} sx={{ px: 0, py: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, borderBottom: i < pendingRequests.length - 1 ? '1px solid #fcd34d' : 'none' }}>
                    <Box mb={{ xs: 1, sm: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Doctor: {req.doctorId}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Requested {new Date(req.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button size="small" variant="contained" color="success" onClick={() => approveRequest(req.doctorId)}>Approve</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => denyRequest(req.doctorId)}>Deny</Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b' }}>Overview</Typography>

        {/* Patient Profile */}
        <Card sx={{ mb: 3, border: "1px solid #cce5df", borderRadius: 3, boxShadow: "none" }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>Patient Details</Typography>
              {!isEditingProfile ? (
                <Button size="small" sx={{ color: '#0f766e', fontWeight: 600 }} onClick={() => setIsEditingProfile(true)}>Edit</Button>
              ) : (
                <Button size="small" variant="contained" onClick={handleSaveProfile} sx={{ backgroundColor: '#0f766e', borderRadius: 4, boxShadow: 'none' }}>Save</Button>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={5} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', ml: 0.5, mb: 0.5, display: 'block' }}>Name</Typography>
                <TextField fullWidth size="small" variant="outlined" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!isEditingProfile} sx={{ '& .MuiInputBase-root': { backgroundColor: '#f1f5f9', borderRadius: 2 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' } }} />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', ml: 0.5, mb: 0.5, display: 'block' }}>Age</Typography>
                <TextField fullWidth size="small" variant="outlined" type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} disabled={!isEditingProfile} sx={{ '& .MuiInputBase-root': { backgroundColor: '#f1f5f9', borderRadius: 2 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' } }} />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', ml: 0.5, mb: 0.5, display: 'block' }}>Blood Group</Typography>
                <TextField fullWidth size="small" variant="outlined" value={profile.bloodGroup} onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })} disabled={!isEditingProfile} sx={{ '& .MuiInputBase-root': { backgroundColor: '#f1f5f9', borderRadius: 2 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' } }} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Dashboard Summary Section */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ border: '1px solid #cce5df', borderRadius: 2, boxShadow: 'none', overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#e8f4f0', py: 1.2, textAlign: 'center', borderBottom: '1px solid #cce5df' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>Total Records</Typography>
              </Box>
              <CardContent sx={{ textAlign: 'center', py: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>{totalRecords}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ border: '1px solid #cce5df', borderRadius: 2, boxShadow: 'none', overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#e8f4f0', py: 1.2, textAlign: 'center', borderBottom: '1px solid #cce5df' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>Latest Visit</Typography>
              </Box>
              <CardContent sx={{ textAlign: 'center', py: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>{latestVisitStr}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ border: '1px solid #cce5df', borderRadius: 2, boxShadow: 'none', overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#e8f4f0', py: 1.2, textAlign: 'center', borderBottom: '1px solid #cce5df' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>Active Doctors</Typography>
              </Box>
              <CardContent sx={{ textAlign: 'center', py: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>{activeDoctorsCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b', mt: 4 }}>Data Privacy & Consent Control</Typography>

        {/* Consent & Access Control Section */}
        <Card sx={{ mb: 4, border: "1px solid #cce5df", borderRadius: 3, boxShadow: "none" }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Grid container>
              <Grid item xs={12} md={6} sx={{ p: 3, borderRight: { md: '1px solid #e2e8f0' }, borderBottom: { xs: '1px solid #e2e8f0', md: 'none' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#0f172a' }}>Grant Temporary Access</Typography>
                <Box display="flex" flexDirection="column" gap={2} mb={3}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', ml: 0.5, mb: 0.5, display: 'block' }}>Doctor Wallet Address</Typography>
                    <TextField 
                      fullWidth size="small" placeholder="0x..." value={grantAddress} onChange={(e) => setGrantAddress(e.target.value)} 
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { borderColor: '#cbd5e1' } } }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', ml: 0.5, mb: 0.5, display: 'block' }}>Purpose</Typography>
                    <TextField 
                      fullWidth size="small" placeholder="Purpose..." value={grantPurpose} onChange={(e) => setGrantPurpose(e.target.value)} 
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { borderColor: '#cbd5e1' } } }}
                    />
                  </Box>
                  <Box display="flex" gap={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', ml: 0.5, mb: 0.5, display: 'block' }}>Access Duration</Typography>
                      <FormControl fullWidth size="small">
                        <Select value={grantDuration} onChange={(e) => setGrantDuration(e.target.value)} sx={{ bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { borderColor: '#cbd5e1' } }}>
                          <MenuItem value={3600}>1 Hour (Emergency)</MenuItem>
                          <MenuItem value={86400}>24 Hours</MenuItem>
                          <MenuItem value={604800}>7 Days</MenuItem>
                          <MenuItem value={2592000}>30 Days</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                  <Button variant="contained" onClick={handleGrantAccess} disableElevation sx={{ background: "#4a8a81", color: "white", borderRadius: 6, py: 1, mt: 1, fontWeight: 600, '&:hover': { background: "#39736a" } }}>
                    GRANT SECURE ACCESS
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6} sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#0f172a' }}>Consent Activity Timeline</Typography>
                <Box sx={{ height: 280, overflowY: 'auto', pr: 1 }}>
                  {reversedHistory.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', mt: 2 }}>No consent activity logged yet.</Typography>
                  ) : (
                    <List disablePadding>
                      {reversedHistory.map((log, idx) => (
                        <ListItem key={idx} alignItems="flex-start" sx={{ px: 0, py: 1.5, position: 'relative', '&::before': { content: '""', position: 'absolute', left: 14, top: 40, bottom: -10, width: 2, bgcolor: '#e2e8f0', display: idx === reversedHistory.length - 1 ? 'none' : 'block' } }}>
                          <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                            <Box sx={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: log.action === "Granted" ? '#0f766e' : '#94a3b8', color: 'white', zIndex: 2, position: 'relative' }}>
                              {log.action === "Granted" ? <VerifiedUserRoundedIcon sx={{ fontSize: 16 }} /> : <BlockRoundedIcon sx={{ fontSize: 16 }} />}
                            </Box>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {log.action} Access for {`${log.doctorId.slice(0, 6)}...${log.doctorId.slice(-4)}`}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                                ({new Date(Number(log.timestamp) * 1000).toLocaleString()})
                              </Typography>
                            }
                            sx={{ m: 0 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Medical Records Header */}
        <Card sx={{ mb: 3, background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: 'white', borderRadius: 2 }}>
          <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>My Medical Records</Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>References stored on-chain • file content on IPFS</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, sm: 0 }, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField 
                size="small" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>) }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select value={sortOrder} label="Sort By" onChange={(e) => setSortOrder(e.target.value)}>
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                </Select>
              </FormControl>
              <Button 
                variant="contained" 
                sx={{ background: 'white', color: '#0f766e', fontWeight: 600, '&:hover': { background: '#f0fdfa' } }}
                onClick={() => setAddRecordModalOpen(true)}
                startIcon={<CloudUploadRoundedIcon />}
              >
                Upload My Record
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4, border: "1px solid #cce5df", borderRadius: 3, boxShadow: "none", overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#e8f4f0', borderBottom: '1px solid #cce5df' }}>
             <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', flex: 1.5, pl: 2 }}>File Name</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', flex: 1.5 }}>Doctor Details</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', flex: 1 }}>Date</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', flex: 1, textAlign: 'center' }}>Actions</Typography>
             </Box>
          </Box>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {filteredRecords.length === 0 ? (
              <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary" mb={1}>No Records Found</Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column">
                {filteredRecords.map((record, index) => (
                  <Box key={index} sx={{ borderBottom: index < filteredRecords.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <Record record={record} onPreview={handlePreview} isTableRow={true} />
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* File Preview Dialog */}
        <Dialog open={previewData.open} onClose={closePreview} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Preview: {previewData.name}</Typography>
            <IconButton onClick={closePreview}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0, height: '75vh', overflow: 'hidden' }}>
            {previewData.cid && (
              <iframe src={`https://med-chain.infura-ipfs.io/ipfs/${previewData.cid}`} width="100%" height="100%" style={{ border: 'none' }} title="File Preview" />
            )}
          </DialogContent>
        </Dialog>

        {/* ===== ADD RECORD MODAL (PATIENT SELF-UPLOAD) ===== */}
        <Modal open={addRecordModalOpen} onClose={() => setAddRecordModalOpen(false)}>
          <AddRecordModal
            handleClose={() => setAddRecordModalOpen(false)}
            handleUpload={handleAddRecordUpload}
            patientAddress={accounts?.[0]}
          />
        </Modal>

      </Box>
    </Box>
  );
};

export default Patient;
