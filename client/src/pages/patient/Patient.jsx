import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Card, CardContent, Typography, Backdrop, CircularProgress,
  TextField, MenuItem, Select, FormControl, InputLabel, Button,
  Grid, Dialog, DialogTitle, DialogContent, IconButton, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, Divider, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import useEth from "../../contexts/EthContext/useEth";
import Record from "../../components/Record";

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
    <Box display="flex" justifyContent="center" width="100%" sx={{ py: 1, px: 2 }}>
      <Box width={{ xs: "100%", md: "90%" }}>
        
        {/* Patient Profile */}
        <Card sx={{ mb: 3, boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)", borderRadius: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#0f766e' }}>Patient Details</Typography>
              {!isEditingProfile ? (
                <Button variant="outlined" onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
              ) : (
                <Button variant="contained" onClick={handleSaveProfile} sx={{ backgroundColor: '#0f766e' }}>Save Profile</Button>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="Full Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!isEditingProfile} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField fullWidth label="Age" type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} disabled={!isEditingProfile} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="Blood Group" value={profile.bloodGroup} onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })} disabled={!isEditingProfile} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth label="Allergies / Notes" value={profile.allergies} onChange={(e) => setProfile({ ...profile, allergies: e.target.value })} disabled={!isEditingProfile} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Dashboard Summary Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: 'none' }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Total Records</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e3a8a' }}>{totalRecords}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', boxShadow: 'none' }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Latest Visit</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#166534' }}>{latestVisitStr}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#fdf4ff', border: '1px solid #fbcfe8', boxShadow: 'none' }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Active Doctors</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#86198f' }}>{activeDoctorsCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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

        {/* Consent & Access Control Section */}
        <Card sx={{ mb: 3, border: "1px solid rgba(15, 118, 110, 0.2)", borderRadius: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <SecurityRoundedIcon sx={{ color: '#0f766e' }} />
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#0f766e' }}>Data Privacy & Consent Control</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Doctors cannot access your medical records by default. You must explicitly grant them permission below. You can revoke access at any time.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Grant Temporary Access</Typography>
                <Box display="flex" flexDirection="column" gap={2} mb={4}>
                  <TextField 
                    fullWidth size="small" label="Doctor Wallet Address" 
                    placeholder="0x..." value={grantAddress} onChange={(e) => setGrantAddress(e.target.value)} 
                  />
                  <Box display="flex" gap={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Purpose</InputLabel>
                      <Select value={grantPurpose} label="Purpose" onChange={(e) => setGrantPurpose(e.target.value)}>
                        <MenuItem value="Consultation">Consultation</MenuItem>
                        <MenuItem value="Lab Result Analysis">Lab Result Analysis</MenuItem>
                        <MenuItem value="Emergency Care">Emergency Care</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>Access Duration</InputLabel>
                      <Select value={grantDuration} label="Access Duration" onChange={(e) => setGrantDuration(e.target.value)}>
                        <MenuItem value={3600}>1 Hour (Emergency)</MenuItem>
                        <MenuItem value={86400}>24 Hours</MenuItem>
                        <MenuItem value={604800}>7 Days</MenuItem>
                        <MenuItem value={2592000}>30 Days</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Button variant="contained" color="primary" onClick={handleGrantAccess} sx={{ background: "#0f766e", alignSelf: 'flex-start' }}>
                    Grant Secure Access
                  </Button>
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Currently Authorized Doctors</Typography>
                <Divider sx={{ mb: 2 }} />
                {consents.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No doctors currently have access to your records.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Purpose</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Expires On</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {consents.map((consent, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{`${consent.doctorId.slice(0, 6)}...${consent.doctorId.slice(-4)}`}</TableCell>
                          <TableCell><Chip label={consent.purpose} size="small" color="primary" variant="outlined" /></TableCell>
                          <TableCell>{new Date(Number(consent.validUntil) * 1000).toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" color="error" onClick={() => handleRevokeAccess(consent.doctorId)}>
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Grid>
              
              <Grid item xs={12} md={5}>
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%', maxHeight: 400, overflowY: 'auto' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>CONSENT ACTIVITY TIMELINE</Typography>
                    {reversedHistory.length === 0 ? (
                      <Typography variant="caption" color="textSecondary">No consent history found.</Typography>
                    ) : (
                      <List dense>
                        {reversedHistory.map((log, idx) => (
                          <ListItem key={idx} alignItems="flex-start" sx={{ px: 0 }}>
                            <ListItemAvatar sx={{ minWidth: 40 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: log.action === "Granted" ? '#dcfce7' : '#fee2e2' }}>
                                {log.action === "Granted" ? <VerifiedUserRoundedIcon sx={{ color: '#16a34a', fontSize: 16 }} /> : <BlockRoundedIcon sx={{ color: '#dc2626', fontSize: 16 }} />}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {log.action} Access for {log.purpose}
                                </Typography>
                              }
                              secondary={
                                <React.Fragment>
                                  <span style={{ display: 'block' }}>Doctor: {`${log.doctorId.slice(0, 6)}...${log.doctorId.slice(-4)}`}</span>
                                  <span>{new Date(Number(log.timestamp) * 1000).toLocaleString()}</span>
                                </React.Fragment>
                              }
                              secondaryTypographyProps={{ variant: "caption", color: "textSecondary" }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
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
            <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, sm: 0 }, background: 'white', p: 1, borderRadius: 2 }}>
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
            </Box>
          </CardContent>
        </Card>

        {filteredRecords.length === 0 ? (
          <Card sx={{ boxShadow: 2, background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)" }}>
            <CardContent sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary" mb={1}>No Records Found</Typography>
              <Typography variant="body2" color="text.secondary">
                {records.length > 0 ? "No records match your search criteria." : "Your medical records will appear here once your doctor uploads them."}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box display="flex" flexDirection="column" gap={2} mb={4}>
            {filteredRecords.map((record, index) => (
              <Box key={index}>
                <Record record={record} onPreview={handlePreview} />
              </Box>
            ))}
          </Box>
        )}

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

      </Box>
    </Box>
  );
};

export default Patient;
