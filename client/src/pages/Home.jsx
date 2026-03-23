import React from "react";
import {
  Box,
  Typography,
  Backdrop,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Grid,
  Stack,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import useEth from "../contexts/EthContext/useEth";
import useAuth from "../contexts/AuthContext/useAuth";
import useAlert from "../contexts/AlertContext/useAlert";
import logo from "../assets/LogoTealBG.jpg";
import "../App.css";

const Home = () => {
  const {
    state: { contract, accounts, role, loading },
    dispatch,
  } = useEth();
  const navigate = useNavigate();
  const { setAlert } = useAlert();
  const { user, login } = useAuth();

  const registerDoctor = async () => {
    if (!contract) {
      setAlert(
        "No EHR contract on this network. Deploy with Truffle and use the same chain in MetaMask.",
        "error"
      );
      return;
    }
    if (!accounts?.length) {
      setAlert("Connect MetaMask and unlock an account.", "error");
      return;
    }
    try {
      await contract.methods.addDoctor().send({ from: accounts[0] });
      dispatch({ type: "ADD_DOCTOR" });
    } catch (err) {
      console.error(err);
      setAlert(err?.message || "Registration failed.", "error");
    }
  };
  const canRegisterDoctor = Boolean(contract && accounts?.length);
  const scrollToHowItWorks = () => {
    const section = document.getElementById("how-it-works");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  const renderPrimaryAction = () => {
    if (!user) {
      return (
        <Button
          variant="contained"
          size="large"
          onClick={login}
          startIcon={<AccountBalanceWalletRoundedIcon />}
          sx={{ px: 3, py: 1.2 }}
        >
          Connect MetaMask
        </Button>
      );
    }

    if (!accounts?.length) {
      return (
        <Typography color="warning.main" variant="body2">
          MetaMask account not detected. Unlock wallet and refresh.
        </Typography>
      );
    }

    if (role === "doctor") {
      return (
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/doctor")}
          startIcon={<LoginRoundedIcon />}
          sx={{ px: 3, py: 1.2 }}
        >
          Go to Doctor Dashboard
        </Button>
      );
    }

    if (role === "patient") {
      return (
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/patient")}
          startIcon={<LoginRoundedIcon />}
          sx={{ px: 3, py: 1.2 }}
        >
          Go to Patient Dashboard
        </Button>
      );
    }

    return (
      <Button
        variant="contained"
        size="large"
        onClick={registerDoctor}
        disabled={!canRegisterDoctor}
        startIcon={<PersonAddAlt1RoundedIcon />}
        sx={{ px: 3, py: 1.2 }}
      >
        Register as Doctor
      </Button>
    );
  };

  return (
    <Box className="home-page-root">
      <Box className="home-hero">
        <Box className="home-hero-glow" />
        <Stack spacing={2} alignItems={{ xs: "flex-start", md: "center" }} textAlign={{ xs: "left", md: "center" }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <img src={logo} alt="sanjeevani-logo" style={{ height: 46, width: 46, borderRadius: 8 }} />
            <Typography variant="h6" fontWeight={700}>
              Sanjeevani
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, maxWidth: 920 }}>
            Secure, tamper-evident medical records for doctors and patients
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 780 }}>
            Sanjeevani is a blockchain EMR demo where doctors upload records to IPFS and store verified
            references on-chain, while patients access only their authorized history.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            {renderPrimaryAction()}
            <Button variant="outlined" size="large" onClick={scrollToHowItWorks}>
              Learn How It Works
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<HubRoundedIcon />} label="Ethereum + MetaMask" />
            <Chip icon={<CloudDoneRoundedIcon />} label="IPFS Storage" />
            <Chip icon={<SecurityRoundedIcon />} label="Role-aware Access" />
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        <Grid item xs={12} md={4}>
          <Card className="home-info-card">
            <CardContent>
              <HealthAndSafetyRoundedIcon color="primary" />
              <Typography variant="h6" mt={1} mb={1}>
                Why this matters
              </Typography>
              <Typography color="text.secondary">
                Medical data is often fragmented across clinics and systems. Sanjeevani improves trust,
                continuity, and traceability.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card className="home-info-card">
            <CardContent>
              <VerifiedUserRoundedIcon color="primary" />
              <Typography variant="h6" mt={1} mb={1}>
                Ownership and consent
              </Typography>
              <Typography color="text.secondary">
                Access checks in the contract ensure only authorized doctors or the patient can read
                records.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card className="home-info-card">
            <CardContent>
              <CloudDoneRoundedIcon color="primary" />
              <Typography variant="h6" mt={1} mb={1}>
                Decentralized integrity
              </Typography>
              <Typography color="text.secondary">
                Files are pinned on IPFS and content references are stored on-chain for auditable medical
                history.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card id="how-it-works" className="home-section-card">
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Typography variant="h5" fontWeight={700} mb={2.5}>
            How it works
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="home-step-box">
                <WalletRoundedIcon color="primary" />
                <Typography fontWeight={600}>1. Connect wallet</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in using MetaMask on the same network as the deployed EHR contract.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="home-step-box">
                <GroupsRoundedIcon color="primary" />
                <Typography fontWeight={600}>2. Register patient</Typography>
                <Typography variant="body2" color="text.secondary">
                  A doctor adds a patient wallet to enable secure record management.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="home-step-box">
                <DescriptionRoundedIcon color="primary" />
                <Typography fontWeight={600}>3. Upload record</Typography>
                <Typography variant="body2" color="text.secondary">
                  The file is uploaded to IPFS and its CID with metadata is written to blockchain.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="home-step-box">
                <SecurityRoundedIcon color="primary" />
                <Typography fontWeight={600}>4. Access authorized data</Typography>
                <Typography variant="body2" color="text.secondary">
                  Doctors and the patient can view permitted records through secure role checks.
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" mt={2.5} display="block">
            Demo note: use MetaMask with the same chain where EHR is deployed for actions to succeed.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2.5} sx={{ my: 4.5 }}>
        <Grid item xs={12} md={6}>
          <Card className="home-role-card">
            <CardContent>
              <Typography variant="h6" mb={1}>
                Doctor
              </Typography>
              <Typography color="text.secondary" mb={2.5}>
                Search patient wallets, register new patients, and upload records to IPFS with on-chain
                references.
              </Typography>
              <Button variant="contained" onClick={() => navigate("/doctor")}>
                Open Doctor Page
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card className="home-role-card">
            <CardContent>
              <Typography variant="h6" mb={1}>
                Patient
              </Typography>
              <Typography color="text.secondary" mb={2.5}>
                View your own records in one place with transparent history and verifiable storage links.
              </Typography>
              <Button variant="outlined" onClick={() => navigate("/patient")}>
                Open Patient Page
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {role === "unknown" && user && (
        <Card className="home-notice-card" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={0.8}>
              Onboarding note
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you are a doctor, complete registration to start adding patients. If you are a patient,
              ask your doctor to register your wallet address first.
            </Typography>
            {!contract && (
              <Typography variant="body2" color="error.main" mt={1.2}>
                Contract is not detected on this network. Switch MetaMask network and refresh.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="home-section-card">
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Typography variant="h5" fontWeight={700} mb={1.2}>
            Security and limitations
          </Typography>
          <Typography color="text.secondary" mb={1}>
            This project is a demonstration app. For production, sensitive upload credentials should be
            handled by a backend service.
          </Typography>
          <Typography color="text.secondary" mb={1}>
            Doctor registration is permissionless in this demo contract model. A stricter approval model
            is recommended for real deployments.
          </Typography>
          <Typography color="text.secondary">
            Stack: React, MUI, MetaMask, Web3.js, Truffle, Ethereum, and IPFS (Pinata).
          </Typography>
        </CardContent>
      </Card>

      <Box className="home-footer">
        <Typography variant="body2" color="text.secondary">
          Sanjeevani Epic - Blockchain EMR demo
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Powered by Ethereum and IPFS
        </Typography>
      </Box>
    </Box>
  );
};

export default Home;
