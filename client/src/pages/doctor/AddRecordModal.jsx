import React, { useState, useCallback, forwardRef } from 'react';
import { Box, Chip, IconButton, Typography, Paper, Fade, TextField, Tabs, Tab } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useDropzone } from 'react-dropzone';
import CustomButton from '../../components/CustomButton';
const AddRecordModal = forwardRef(({ handleClose, handleUpload, patientAddress }, ref) => {
  const [file, setFile] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [category, setCategory] = useState('');
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');
  
  const [tabIndex, setTabIndex] = useState(0);
  const [noteContent, setNoteContent] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setBuffer(null);

    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedFile);
    reader.onloadend = () => {
      const buf = Buffer.from(reader.result);
      setBuffer(buf);
    };
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const handleUploadClick = async () => {
    setIsUploading(true);
    try {
      const metadata = JSON.stringify({ category, hospital, notes });
      let uploadBuffer = buffer;
      let uploadFileName = file?.name;
      
      if (tabIndex === 1) {
        uploadBuffer = Buffer.from(noteContent, 'utf8');
        const dateStr = new Date().toISOString().split('T')[0];
        uploadFileName = `Clinical_Note_${dateStr}.txt`;
      }
      
      await handleUpload(uploadBuffer, uploadFileName, patientAddress, metadata);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Fade in={true} timeout={400}>
      <Box
        ref={ref}
        tabIndex="-1"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          outline: 'none',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Paper
          elevation={24}
          sx={{
            position: 'relative',
            width: { xs: '90%', sm: '60%', md: '50%' },
            p: 4,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid rgba(15, 118, 110, 0.15)',
          }}
        >
          <IconButton
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Close upload dialog"
            sx={{ 
              position: 'absolute', 
              top: 16, 
              right: 16,
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(0, 121, 107, 0.1)',
                transform: 'rotate(90deg)',
              },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 28 }} />
          </IconButton>

          <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabIndex} 
              onChange={(e, newValue) => setTabIndex(newValue)}
              TabIndicatorProps={{ style: { backgroundColor: '#00796b' } }}
              textColor="inherit"
              sx={{ '& .Mui-selected': { color: '#00796b', fontWeight: 600 } }}
            >
              <Tab label="Upload File" />
              <Tab label="Create Note" />
            </Tabs>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#00796b', mb: 1 }}>
              {tabIndex === 0 ? "Upload Medical Record" : "Generate Medical Note"}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem' }}>
              {tabIndex === 0 ? "Select a file to upload and secure on IPFS" : "Write note contents to be securely stored on-chain."}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField fullWidth size="small" label="Category / Diagnosis" value={category} onChange={(e) => setCategory(e.target.value)} />
            <TextField fullWidth size="small" label="Hospital / Clinic" value={hospital} onChange={(e) => setHospital(e.target.value)} />
          </Box>
          <Box sx={{ mb: 3 }}>
            <TextField fullWidth size="small" label="Short Summary/Metadata" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
          </Box>

          {tabIndex === 0 ? (
            <Box
              {...getRootProps()}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isDragActive ? '#00796b' : 'rgba(0, 121, 107, 0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                background: isDragActive 
                  ? 'linear-gradient(135deg, rgba(0, 121, 107, 0.08) 0%, rgba(0, 188, 212, 0.08) 100%)'
                  : 'rgba(0, 121, 107, 0.03)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: '#00796b',
                  background: 'linear-gradient(135deg, rgba(0, 121, 107, 0.08) 0%, rgba(0, 188, 212, 0.08) 100%)',
                },
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <input {...getInputProps()} disabled={isUploading} />
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <CloudUploadRoundedIcon sx={{ fontSize: 48, color: isDragActive ? '#00796b' : 'rgba(0, 121, 107, 0.5)', mb: 2, transition: 'all 0.3s ease' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#00796b', mb: 1 }}>
                  {isDragActive ? 'Drop file here' : 'Drag and drop your file'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  or click to browse
                </Typography>
              </Box>
            </Box>
          ) : (
             <Box sx={{ mb: 1 }}>
               <TextField 
                 fullWidth 
                 label="Full Clinical Note (will be generated as .txt on IPFS)" 
                 value={noteContent} 
                 onChange={(e) => setNoteContent(e.target.value)} 
                 multiline 
                 rows={6}
                 variant="outlined"
                 placeholder="Type full observations, prescriptions, and instructions here..."
               />
             </Box>
          )}

          {(file || (tabIndex === 1 && noteContent.trim())) && (
            <Fade in={true} timeout={300}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 3,
                  p: 2,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(0, 121, 107, 0.05) 0%, rgba(76, 175, 80, 0.05) 100%)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 28, color: '#4caf50' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#00796b' }}>
                      {tabIndex === 0 ? "✓ File selected" : "✓ Note Ready"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ wordBreak: 'break-all' }}>
                      {tabIndex === 0 ? file.name : "Clinical_Note.txt"}
                    </Typography>
                  </Box>
                </Box>
                <CustomButton
                  text={isUploading ? "Uploading..." : "Upload"}
                  handleClick={handleUploadClick}
                  disabled={isUploading || (tabIndex === 0 && !buffer) || (tabIndex === 1 && !noteContent.trim())}
                >
                  {tabIndex === 0 ? <CloudUploadRoundedIcon style={{ color: "white" }} /> : <EditNoteRoundedIcon style={{ color: "white" }} />}
                </CustomButton>
              </Box>
            </Fade>
          )}

          {tabIndex === 0 && !file && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              Max file size: 100MB | Supported: PDF, DOCX, JPG, PNG, etc.
            </Typography>
          )}
        </Paper>
      </Box>
    </Fade>
  );
});

AddRecordModal.displayName = 'AddRecordModal';
export default AddRecordModal;