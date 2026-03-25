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
    { label: "Reports", to: "/reports" },
  ];
  const shortAccount =
    accountText && accountText.startsWith("0x")
      ? `${accountText.slice(0, 6)}...${accountText.slice(-4)}`
      : accountText;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar position="sticky" sx={{ background: "#06403d", boxShadow: 1 }}>
        <Toolbar sx={{ display: "flex", gap: 3, alignItems: "center", minHeight: { xs: "64px", sm: "70px" } }}>
          <Box display="flex" alignItems="center" component={RouterLink} to="/" sx={{ textDecoration: "none" }}>
              <img src={logo} alt="sanjeevani-logo" style={{ height: 32, width: 32, marginRight: 12, borderRadius: 6 }} />
              <Typography variant="h6" color="white" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                Sanjeevani Epic
              </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: 3, ml: 3 }}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                sx={{
                  color: location.pathname === item.to ? "#4ade80" : "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  letterSpacing: "0.5px",
                  borderBottom: location.pathname === item.to ? "2px solid #4ade80" : "2px solid transparent",
                  borderRadius: 0,
                  pb: 0.5,
                  minWidth: "auto",
                  textTransform: "uppercase",
                  "&:hover": {
                    backgroundColor: "transparent",
                    color: "white"
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Box display={{ xs: "none", md: "flex" }} alignItems="center" sx={{ 
              backgroundColor: "rgba(255,255,255,0.1)", 
              px: { xs: 1, sm: 2 }, py: 0.8, borderRadius: 8 
            }}>
              <PersonRoundedIcon sx={{ color: "rgba(255,255,255,0.9)", fontSize: 20 }} />
              <Typography variant="body2" color="white" sx={{ ml: 0.8, mr: 1.5, fontWeight: 500, fontSize: "0.85rem" }}>
                {shortAccount}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: "0.5px" }}>
                {chipLabel.toUpperCase()}
              </Typography>
            </Box>

            {!user ? (
              <Button variant="outlined" onClick={login} disabled={authLoading} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, px: 3 }}>
                {authLoading ? 'CONNECTING...' : 'LOGIN'}
              </Button>
            ) : (
              <Button variant="outlined" onClick={logout} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, px: 2 }}>
                LOGOUT
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

      <Box component="main" sx={{ 
        maxWidth: location.pathname === "/" ? "100%" : 1200, 
        mx: "auto", 
        p: location.pathname === "/" ? 0 : { xs: 2, md: 3 } 
      }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
