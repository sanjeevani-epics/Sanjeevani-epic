import React from "react";
import { Box, Alert, Typography, Slide } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import useAlert from "../../contexts/AlertContext/useAlert";

const AlertPopup = () => {
  const { text, type } = useAlert();

  if (!text || !type) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <ErrorIcon sx={{ fontSize: 24 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 24 }} />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 24 }} />;
      case 'info':
      default:
        return <InfoIcon sx={{ fontSize: 24 }} />;
    }
  };

  const getBackgroundStyle = () => {
    switch (type) {
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
          borderLeft: '4px solid #f44336',
          color: '#c62828',
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          borderLeft: '4px solid #ff9800',
          color: '#e65100',
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          borderLeft: '4px solid #4caf50',
          color: '#1b5e20',
        };
      case 'info':
      default:
        return {
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderLeft: '4px solid #2196f3',
          color: '#0d47a1',
        };
    }
  };

  return (
    <Slide direction="down" in={true} timeout={400} mountOnEnter unmountOnExit>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          position: "fixed",
          top: 16,
          zIndex: 1400,
        }}
      >
        <Alert
          icon={getIcon()}
          severity={type}
          role="status"
          aria-live="polite"
          sx={{
            width: { xs: "90%", sm: "auto" },
            minWidth: { sm: 350 },
            maxWidth: 550,
            pr: 3,
            paddingY: 1.5,
            paddingX: 2,
            borderRadius: "10px",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.15)",
            border: "none",
            ...getBackgroundStyle(),
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          >
            {text}
          </Typography>
        </Alert>
      </Box>
    </Slide>
  );
};

export default AlertPopup;
