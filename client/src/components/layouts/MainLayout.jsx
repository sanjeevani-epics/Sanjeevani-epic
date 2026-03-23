import React from "react";
import {
  AppBar,
  Chip,
  Toolbar,
  Box,
  Typography,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import useEth from "../../contexts/EthContext/useEth";
import useAuth from "../../contexts/AuthContext/useAuth";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import logo from "../../assets/LogoTealBG.jpg";

const MainLayout = () => {
  const { state: { accounts, role } } = useEth();
  const { user, login, logout, authLoading } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const accountText = accounts?.[0] ?? "Wallet not connected";
  const chipLabel = role === "unknown" ? "not registered" : role;
  const navItems = [
    { label: "Home", to: "/" },
    { label: "Doctor", to: "/doctor" },
    { label: "Patient", to: "/patient" },
  ];
  const shortAccount =
    accountText && accountText.startsWith("0x")
      ? `${accountText.slice(0, 6)}...${accountText.slice(-4)}`
      : accountText;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar position="sticky" sx={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)", boxShadow: 2 }}>
        <Toolbar sx={{ display: "flex", gap: 2 }}>
          <Box display="flex" alignItems="center" component={RouterLink} to="/" sx={{ textDecoration: "none" }}>
              <img src={logo} alt="sanjeevani-logo" style={{ height: 52, width: 52, marginRight: 8, borderRadius: 8 }} />
              <Typography variant="h6" color="white" sx={{ fontWeight: 700 }}>
                Sanjeevani Epic
              </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "flex" }, gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                sx={{
                  color: "rgba(255,255,255,0.95)",
                  backgroundColor: location.pathname === item.to ? "rgba(255,255,255,0.18)" : "transparent",
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box display="flex" alignItems="center" gap={1.5}>
            <Box display={{ xs: "none", md: "flex" }} alignItems="center">
              <PersonRoundedIcon sx={{ color: "rgba(255,255,255,0.9)", fontSize: 22 }} />
              <Typography variant="body2" color="white" sx={{ ml: 0.5, mr: 1, fontWeight: 500 }}>
                {shortAccount}
              </Typography>
              <Chip
                label={chipLabel}
                size="small"
                sx={{ fontSize: 12, backgroundColor: "rgba(255,255,255,0.12)", color: "white" }}
              />
            </Box>

            {!user ? (
              <Button variant="contained" color="secondary" onClick={login} disabled={authLoading} sx={{ backgroundColor: '#fff', color: '#00796b' }}>
                {authLoading ? 'Connecting...' : 'Login'}
              </Button>
            ) : (
              <Button variant="outlined" onClick={logout} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                Logout
              </Button>
            )}
            <IconButton
              color="inherit"
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuRoundedIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240, pt: 1 }}>
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={location.pathname === item.to}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
