import React, { useState, useCallback } from "react";
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
} from "@mui/material";
import CustomButton from "../../components/CustomButton";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
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

  const searchPatient = async () => {
    if (!contract || !accounts?.length) {
      setAlert("Connect MetaMask and ensure the contract is deployed on this network.", "error");
      return;
    }
    if (!/^(0x)?[0-9a-f]{40}$/i.test(searchPatientAddress)) {
      setAlert("Please enter a valid wallet address", "error");
      return;
    }
    try {
      const exists = await contract.methods
        .getPatientExists(searchPatientAddress)
        .call({ from: accounts[0] });
      if (exists) {
        const recs = await contract.methods
          .getRecords(searchPatientAddress)
          .call({ from: accounts[0] });
        setRecords(recs);
        setPatientExist(true);
      } else {
        setAlert("Patient does not exist", "error");
        setPatientExist(false);
        setRecords([]);
      }
    } catch (err) {
      console.error(err);
      setAlert(err?.message || "Could not search for patient. Check the network and try again.", "error");
    }
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
    async (buffer, fileName, patientAddress) => {
      if (!patientAddress) {
        setAlert("Please search for a patient first", "error");
        return;
      }
      try {
        const ipfsHash = await uploadToIPFS(buffer, fileName);
        if (ipfsHash) {
          await contract.methods
            .addRecord(ipfsHash, fileName, patientAddress)
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
          </CardContent>
        </Card>

        {patientExist && (
          <Card sx={{
            mb: 3,
          }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Patient Records ({records.length})
                </Typography>
                <CustomButton text="+ New Record" handleClick={() => setAddRecord(true)}>
                  <CloudUploadRoundedIcon style={{ color: "white" }} />
                </CustomButton>
              </Box>

              {records.length === 0 ? (
                <Box display="flex" justifyContent="center" py={5}>
                  <Typography variant="body1" color="text.secondary">
                    No records found for this patient
                  </Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {records.map((record, index) => (
                    <Box key={index}>
                      <Record record={record} />
                    </Box>
                  ))}
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
