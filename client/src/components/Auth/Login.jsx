import React from "react";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import useAuth from "../../contexts/AuthContext/useAuth";
import useEth from "../../contexts/EthContext/useEth";
import useAlert from "../../contexts/AlertContext/useAlert";

const Login = () => {
  const { user, login, logout, authLoading } = useAuth();
  const { state } = useEth();
  const { setAlert } = useAlert();
  const accounts = state?.accounts;

  const handleLogin = async () => {
    if (!accounts || !accounts[0]) {
      try {
        // trigger metamask connect
        await state.web3.eth.requestAccounts();
      } catch (err) {
        console.error(err);
        return;
      }
    }

    const res = await login();
    if (!res.success) {
      setAlert(`Login failed: ${res.error || "unknown"}`, "error");
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" mt={8}>
      <Card sx={{ width: { xs: "100%", sm: 520 }, p: { xs: 1, sm: 2 } }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h5">Secure Wallet Login</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Connect with MetaMask to continue to your doctor or patient dashboard.
            </Typography>
      {!user ? (
            <Button variant="contained" color="primary" onClick={handleLogin} disabled={authLoading}>
              {authLoading ? "Connecting..." : "Login with MetaMask"}
            </Button>
      ) : (
            <>
          <Typography variant="subtitle2" color="text.secondary">
            Logged in as
          </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {user.address}
              </Typography>
          <Button variant="outlined" color="secondary" onClick={logout}>
            Logout
          </Button>
            </>
      )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
