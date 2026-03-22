import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Backdrop, CircularProgress } from "@mui/material";
import useEth from "../../contexts/EthContext/useEth";
import Record from "../../components/Record";

const Patient = () => {
  const {
    state: { contract, accounts, role, loading },
  } = useEth();

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (!contract || !accounts?.length) {
      setLoadingRecords(false);
      return;
    }

    let cancelled = false;
    setLoadingRecords(true);

    const fetchRecords = async () => {
      try {
        const recs = await contract.methods
          .getRecords(accounts[0])
          .call({ from: accounts[0] });
        if (!cancelled) setRecords(recs);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    };

    fetchRecords();
    return () => {
      cancelled = true;
    };
  }, [contract, accounts]);

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

  if (loadingRecords) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loadingRecords}
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
          No EHR contract found on this network. Deploy the contract with Truffle on the same chain as
          MetaMask, then refresh (ensure client/src/contracts/EHR.json includes this network).
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

  if (role === "doctor") {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <Typography variant="h5">Only patient can access this page</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" width="100%" sx={{ py: 1 }}>
      <Box width={{ xs: "100%", md: "90%" }}>
        <Card sx={{
          mb: 3,
          background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
          color: 'white',
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              My Medical Records
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              References stored on-chain • file content on IPFS (add end-to-end encryption for real PHI)
            </Typography>
          </CardContent>
        </Card>

        {records.length === 0 ? (
          <Card sx={{
            boxShadow: 2,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          }}>
            <CardContent sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary" mb={1}>
                No Records Yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your medical records will appear here once your doctor uploads them.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {records.map((record, index) => (
              <Box key={index}>
                <Record record={record} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Patient;
