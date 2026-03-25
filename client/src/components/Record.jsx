import React, { useState } from "react";
import {
  Card,
  CardContent,
  IconButton,
  Typography,
  Grid,
  Box,
  Chip,
  Snackbar,
  Tooltip,
} from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";

const Record = ({ record, onPreview, isTableRow }) => {
  // Extract including metadata
  const [cid, name, patientId, doctorId, timestamp, metadataStr] = record;

  const [shareOpen, setShareOpen] = useState(false);

  let metadata = { category: "", hospital: "", notes: "" };
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr);
    } catch (e) {
      console.warn("Could not parse metadata for complete details", e);
    }
  }

  const shareLink = `https://med-chain.infura-ipfs.io/ipfs/${cid}`;

  const handleShareClick = () => {
    navigator.clipboard.writeText(shareLink);
    setShareOpen(true);
  };

  const handleShareClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShareOpen(false);
  };

  const actionBox = (
    <React.Fragment>
      <Box sx={{ display: 'flex', flexDirection: 'column', pr: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>Link Copied to Clipboard!</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>For security, link expires in 24h.</Typography>
      </Box>
      <IconButton size="small" aria-label="close" sx={{ color: 'white' }} onClick={handleShareClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </React.Fragment>
  );

  if (isTableRow) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
        <Box sx={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, pl: 1 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DescriptionRoundedIcon sx={{ color: 'white' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, color: '#0f172a' }}>{name}</Typography>
            {metadata.category && <Chip label={metadata.category} size="small" sx={{ height: 18, fontSize: '0.65rem', mt: 0.5, bgcolor: '#e8f4f0', color: '#0f766e', fontWeight: 600 }} />}
          </Box>
        </Box>

        <Box sx={{ flex: 1.5, pr: 2 }}>
          <Typography sx={{ fontWeight: 500, color: '#334155' }}>
            {metadata.hospital ? metadata.hospital : `${doctorId.slice(0, 6)}...${doctorId.slice(-4)}`}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 500, color: '#334155' }}>
            {dayjs.unix(timestamp).format("MMM DD, YYYY")}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Tooltip title="Share secure link">
            <IconButton onClick={handleShareClick} sx={{ bgcolor: '#e8f4f0', color: '#0f766e', p: 1, '&:hover': { bgcolor: '#cce5df' } }}>
              <IosShareRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onPreview && (
            <Tooltip title="Preview inline">
              <IconButton onClick={() => onPreview(cid, name)} sx={{ bgcolor: '#e8f4f0', color: '#0f766e', p: 1, '&:hover': { bgcolor: '#cce5df' } }}>
                <VisibilityRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Download IPFS file">
            <a href={shareLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <IconButton sx={{ bgcolor: '#e8f4f0', color: '#0f766e', p: 1, '&:hover': { bgcolor: '#cce5df' } }}>
                <CloudDownloadRoundedIcon fontSize="small" />
              </IconButton>
            </a>
          </Tooltip>
        </Box>

        <Snackbar
          open={shareOpen}
          autoHideDuration={4000}
          onClose={handleShareClose}
          message="Link copied to clipboard"
          action={actionBox}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ '& .MuiSnackbarContent-root': { backgroundColor: '#0f766e', borderRadius: '12px' } }}
        />
      </Box>
    );
  }

  return (
    <Card sx={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
      border: "1px solid rgba(15, 118, 110, 0.12)",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
      transition: "all 0.2s ease",
      '&:hover': {
        boxShadow: "0 10px 20px rgba(15, 118, 110, 0.15)",
        transform: "translateY(-1px)",
      },
      position: 'relative',
    }}>
      <CardContent sx={{ pb: metadata.notes ? 1 : 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={1}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)',
            }}>
              <DescriptionRoundedIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Box display="flex" flexDirection="column">
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                File Name
              </Typography>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, mt: 0.5 }}>
                {name}
              </Typography>
              {metadata.category && (
                <Box mt={0.5}>
                  <Chip label={metadata.category} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box display="flex" flexDirection="column">
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Doctor Address & Location
              </Typography>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500, mt: 0.5, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {`${doctorId.slice(0, 6)}...${doctorId.slice(-4)}`}
              </Typography>
              {metadata.hospital && (
                <Typography variant="caption" sx={{ color: '#00796b', fontWeight: 600, mt: 0.2 }}>
                  🏥 {metadata.hospital}
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Box display="flex" flexDirection="column">
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Date Created
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                {dayjs.unix(timestamp).format("MMM DD, YYYY")}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={2} display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Share secure link">
              <IconButton
                aria-label="Share record"
                onClick={handleShareClick}
                sx={{
                  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
                  color: 'white',
                  width: 44,
                  height: 44,
                  transition: "all 0.2s ease",
                  '&:hover': {
                    transform: "scale(1.05)",
                    boxShadow: "0 6px 16px rgba(15, 118, 110, 0.25)",
                  },
                }}
              >
                <IosShareRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {onPreview && (
              <Tooltip title="Preview inline">
                <IconButton
                  aria-label="Preview record"
                  onClick={() => onPreview(cid, name)}
                  sx={{
                    background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
                    color: 'white',
                    width: 44,
                    height: 44,
                    transition: "all 0.2s ease",
                    '&:hover': {
                      transform: "scale(1.05)",
                      boxShadow: "0 6px 16px rgba(15, 118, 110, 0.25)",
                    },
                  }}
                >
                  <VisibilityRoundedIcon fontSize="small"/>
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Download IPFS file">
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <IconButton
                  aria-label="Download record from IPFS"
                  sx={{
                    background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
                    color: 'white',
                    width: 44,
                    height: 44,
                    transition: "all 0.2s ease",
                    '&:hover': {
                      transform: "scale(1.05)",
                      boxShadow: "0 6px 16px rgba(15, 118, 110, 0.25)",
                    },
                  }}
                >
                  <CloudDownloadRoundedIcon fontSize="small"/>
                </IconButton>
              </a>
            </Tooltip>
          </Grid>
        </Grid>
        
        {/* Clinical Notes Expandable / Extra row if existent */}
        {metadata.notes && (
          <Box mt={1.5} p={1.5} sx={{ backgroundColor: 'rgba(0,121,107,0.04)', borderRadius: '8px', borderLeft: '3px solid #00796b' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'textSecondary', display: 'block', mb: 0.5 }}>
              CLINICAL HIGHLIGHTS
            </Typography>
            <Typography variant="body2" color="textPrimary">
              {metadata.notes}
            </Typography>
          </Box>
        )}
      </CardContent>

      <Snackbar
        open={shareOpen}
        autoHideDuration={4000}
        onClose={handleShareClose}
        message="Link copied to clipboard"
        action={actionBox}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: '#0f766e',
            borderRadius: '12px',
          }
        }}
      />
    </Card>
  );
};

export default Record;
