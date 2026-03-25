import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0f766e",
      dark: "#115e59",
      light: "#14b8a6",
    },
    secondary: {
      main: "#4ade80",
    },
    background: {
      default: "#f0f7f4",
      paper: "#ffffff",
    },
    success: {
      main: "#2e7d32",
    },
    warning: {
      main: "#ed6c02",
    },
    error: {
      main: "#d32f2f",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          minWidth: 320,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(15, 118, 110, 0.10)",
          boxShadow: "0 6px 24px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});

export default theme;
