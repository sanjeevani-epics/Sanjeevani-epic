import React from "react";
import {
  Box,
  Typography,
  Backdrop,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import VideoCover from "react-video-cover";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import CustomButton from "../components/CustomButton";
import useEth from "../contexts/EthContext/useEth";
import useAuth from "../contexts/AuthContext/useAuth";
import useAlert from "../contexts/AlertContext/useAlert";
import BackgroundVideo from "../assets/BackgroundVideo.mp4";
import logo from "../assets/LogoTealBG.jpg";
import "../App.css";

const Home = () => {
  const {
    state: { contract, accounts, role, loading },
    dispatch,
  } = useEth();
  const navigate = useNavigate();
  const { setAlert } = useAlert();

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

  const { user, login } = useAuth();

  const canRegisterDoctor = Boolean(contract && accounts?.length);

  const ActionSection = () => {
    // If user is not logged in, show prominent login CTA
    if (!user) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h5" color="white" mb={2}>
            Welcome — connect your wallet to manage records securely
          </Typography>
          <CustomButton text="Login with MetaMask" handleClick={login}>
            <AccountBalanceWalletRoundedIcon style={{ color: "white" }} />
          </CustomButton>
          <Box mt={3}>
            <Typography variant="body2" color="white">Future features preview: secure sharing, analytics, doctor directory (coming soon)</Typography>
          </Box>
        </Box>
      );
    }

    if (!accounts?.length) {
      return (
        <Typography variant="h5" color="white">
          Open your MetaMask wallet to get connected, then refresh this page
        </Typography>
      );
    }

    if (role === "unknown") {
      return (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Box mb={2}>
            <CustomButton
              text="Doctor Register"
              handleClick={registerDoctor}
              disabled={!canRegisterDoctor}
            >
              <PersonAddAlt1RoundedIcon style={{ color: "white" }} />
            </CustomButton>
          </Box>
          {!contract && (
            <Typography variant="body2" color="rgba(255,255,255,0.85)" textAlign="center" mb={1}>
              Contract not deployed on this network — switch MetaMask to your Ganache/local chain or
              deploy EHR and refresh.
            </Typography>
          )}
          <Typography variant="h5" color="white">
            If you are a patient, ask your doctor to register for you
          </Typography>
        </Box>
      );
    }

    if (role === "patient") {
      return (
        <CustomButton text="Patient Portal" handleClick={() => navigate("/patient")}>
          <LoginRoundedIcon style={{ color: "white" }} />
        </CustomButton>
      );
    }

    if (role === "doctor") {
      return (
        <CustomButton text="Doctor Portal" handleClick={() => navigate("/doctor")}>
          <LoginRoundedIcon style={{ color: "white" }} />
        </CustomButton>
      );
    }

    return null;
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

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      width="100%"
      minHeight="calc(100vh - 96px)"
      id="background"
    >
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          top: 0,
          left: 0,
          zIndex: -1,
        }}
      >
        <VideoCover
          videoOptions={{ src: BackgroundVideo, autoPlay: true, loop: true, muted: true }}
        />
      </Box>

      <Box
        id="home-page-box"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        width={{ xs: "100%", md: "85%" }}
        maxWidth={900}
        p={{ xs: 2.5, md: 5 }}
      >
        <Card sx={{ width: "100%", backgroundColor: "rgba(15, 23, 42, 0.68)", borderColor: "rgba(255,255,255,0.2)" }}>
          <CardContent sx={{ py: 5 }}>
            <Box display="flex" justifyContent="center">
              <img src={logo} alt="med-chain-logo" style={{ height: 50 }} />
            </Box>
            <Box mt={2} mb={3} textAlign="center">
              <Typography variant="h4" color="white">
                Own Your Health
              </Typography>
              <Typography variant="body1" color="rgba(255,255,255,0.9)" mt={1}>
                Trusted health records for doctors and patients, secured with blockchain.
              </Typography>
            </Box>

            <ActionSection />

            <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
              <Typography variant="body2" color="white">
                Powered by Ethereum and IPFS
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Home;
