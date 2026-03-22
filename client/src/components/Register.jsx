import { useContext, useState } from "react";
import { Box, Card, CardContent, Typography, CircularProgress, Chip } from "@mui/material";
import EthContext from "../contexts/EthContext/EthContext";
import CustomButton from "./CustomButton";
import useAlert from "../contexts/AlertContext/useAlert";

const Register = () => {
  const { state: { contract, accounts } } = useContext(EthContext);
  const { setAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  const registerAsDoctor = async () => {
    if (!contract || !accounts?.length) {
      setAlert("Wallet not connected correctly.", "error");
      return;
    }
    
    setLoading(true);
    try {
      await contract.methods.addDoctor().send({ from: accounts[0] });
      setAlert("Registration successful.", "success");
      window.location.reload(); // Reloads to let EthProvider fetch the new 'doctor' role
    } catch (err) {
      console.error("Registration failed", err);
      setAlert("Transaction failed or rejected.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      width="100%"
      sx={{
        background: "linear-gradient(160deg, rgba(15,118,110,0.14) 0%, rgba(15,23,42,0.06) 100%)",
        p: 2,
      }}
    >
      <Card
        sx={{
          width: { xs: "90%", sm: "80%", md: "60%" },
          maxWidth: 500,
          p: 4,
          borderRadius: "16px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <CardContent sx={{ textAlign: 'center', p: 0 }}>
          <Box mb={4}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              Sanjeevani
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ fontSize: '1.05rem', fontWeight: 500 }}>
              Healthcare on the Blockchain
            </Typography>
          </Box>

          <Box
            sx={{
              p: 3,
              borderRadius: '12px',
              background: "linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(20,184,166,0.08) 100%)",
              border: "1px solid rgba(15,118,110,0.15)",
              mb: 4,
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2, fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Your Wallet
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                color: "#115e59",
                wordBreak: 'break-all',
                mb: 2,
              }}
            >
              {accounts?.[0]}
            </Typography>
            <Chip
              label="Not Registered"
              color="error"
              variant="filled"
              size="medium"
              sx={{
                fontWeight: 700,
                borderRadius: '8px',
              }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2, lineHeight: 1.8 }}>
              You need to register as a Doctor to manage patient records on Sanjeevani.
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
              This transaction will register your wallet on the blockchain.
            </Typography>
          </Box>

          <Box sx={{ position: 'relative' }}>
            <CustomButton
              text={loading ? "Registering..." : "Register as Doctor"}
              handleClick={registerAsDoctor}
              disabled={loading || !contract || !accounts?.length}
            />
          </Box>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 3 }}>
            Need help? Make sure MetaMask is connected and you have enough ETH for gas fees.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;