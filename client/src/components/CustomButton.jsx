import React from "react";
import { Button, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";

const CustomButton = ({ text, handleClick, disabled = false, startIcon, children }) => {
  return (
    <Button
      startIcon={startIcon || children}
      variant="contained"
      onClick={handleClick}
      disabled={disabled}
      sx={{
        background: disabled 
          ? grey[400] 
          : "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
        textTransform: "none",
        padding: "10px 22px",
        borderRadius: "10px",
        fontWeight: 600,
        fontSize: "0.9rem",
        transition: "all 0.2s ease",
        boxShadow: disabled ? "none" : "0 4px 12px rgba(15, 118, 110, 0.25)",
        position: 'relative',
        overflow: 'hidden',
        "&:hover": disabled ? {} : {
          transform: "translateY(-1px)",
          boxShadow: "0 8px 18px rgba(15, 118, 110, 0.3)",
          background: "linear-gradient(135deg, #115e59 0%, #0f766e 100%)",
        },
        "&:active": disabled ? {} : {
          transform: "translateY(0)",
          boxShadow: "0 4px 10px rgba(15, 118, 110, 0.25)",
        },
        "&:disabled": {
          opacity: 0.6,
          cursor: "not-allowed",
        },
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Typography variant="button" color="white" sx={{ fontWeight: 600, position: "relative", zIndex: 1 }}>
        {text}
      </Typography>
    </Button>
  );
};

export default CustomButton;

