import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { downloadFile, authorizedFileFetch } from '../../utils/fileDownload';

/** MIME / extensions browsers generally cannot show in <img> (decode fails or unsupported). */
function isNonDisplayableRasterImage(file) {
  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.originalName || file.fileName || '').toLowerCase();
  const ext = name.split('.').pop() || '';

  if (mime === 'image/tiff' || mime === 'image/x-tiff') return true;
  if (['tiff', 'tif'].includes(ext)) return true;
  if (mime === 'image/heic' || mime === 'image/heif') return true;
  if (['heic', 'heif'].includes(ext)) return true;

  return false;
}

function getFileType(file) {
  if (isNonDisplayableRasterImage(file)) {
    return 'imageUnsupported';
  }

  const mimeType = (file.mimeType || '').toLowerCase();
  const fileName = (file.originalName || file.fileName || '').toLowerCase();
  const extension = fileName.split('.').pop() || '';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('text/')) return 'text';

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const textExtensions = ['txt', 'csv', 'json', 'xml', 'md', 'log'];

  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (textExtensions.includes(extension)) return 'text';
  if (extension === 'pdf') return 'pdf';

  return 'other';
}

export function FilePreviewDialog({ open, file, onClose, onDownloadError, getAccessToken }) {
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef('');

  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }
    setMediaUrl('');
    setTextContent('');
    setError(null);

    if (!open || !file?.fileUrl) {
      setLoading(false);
      return undefined;
    }

    const fileType = getFileType(file);
    let cancelled = false;

    const fail = (msg) => {
      if (!cancelled) {
        setError(msg);
        setLoading(false);
      }
    };

    const token = getAccessToken?.();

    if (fileType === 'imageUnsupported') {
      setLoading(false);
      return undefined;
    }

    if (fileType === 'text') {
      setLoading(true);
      authorizedFileFetch(file.fileUrl, token)
        .then((res) => {
          if (cancelled) return;
          return res.text();
        })
        .then((text) => {
          if (!cancelled) {
            setTextContent(text);
            setLoading(false);
          }
        })
        .catch(() => fail('Failed to load file content'));
      return () => {
        cancelled = true;
      };
    }

    if (fileType === 'image' || fileType === 'pdf' || fileType === 'video') {
      setLoading(true);
      authorizedFileFetch(file.fileUrl, token)
        .then((res) => {
          if (cancelled) return;
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          const type = file.mimeType || blob.type || undefined;
          const finalBlob = type ? new Blob([blob], { type }) : blob;
          const url = URL.createObjectURL(finalBlob);
          blobUrlRef.current = url;
          setMediaUrl(url);
          setLoading(false);
        })
        .catch(() => fail('Failed to load file'));
      return () => {
        cancelled = true;
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = '';
        }
      };
    }

    setLoading(false);
    return undefined;
  }, [open, file, getAccessToken]);

  if (!file) {
    return null;
  }

  const fileType = getFileType(file);
  const displayName = file.originalName || file.fileName || 'File';

  const handleDownload = () => {
    downloadFile(file.fileUrl, displayName, onDownloadError, getAccessToken?.());
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    switch (fileType) {
      case 'imageUnsupported':
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              gap: 2,
              px: 2,
              textAlign: 'center'
            }}
          >
            <Typography variant="body1" color="text.secondary">
              This image format (TIFF, HEIC, etc.) cannot be shown in the browser preview. Download the file to open it
              in another application.
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {file.mimeType || 'Image'}
            </Typography>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}>
              Download
            </Button>
          </Box>
        );

      case 'image':
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: '70vh',
              overflow: 'auto'
            }}
          >
            <img
              src={mediaUrl}
              alt={displayName}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
              onError={() => setError('Failed to load image')}
            />
          </Box>
        );

      case 'pdf':
        return (
          <Box
            sx={{
              width: '100%',
              height: '70vh',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <iframe src={mediaUrl} title={displayName} style={{ width: '100%', height: '100%', border: 'none' }} />
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '70vh' }}>
            <video controls style={{ maxWidth: '100%', maxHeight: '70vh' }}>
              <source src={mediaUrl} type={file.mimeType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          </Box>
        );

      case 'text':
        return (
          <Box
            sx={{
              maxHeight: '70vh',
              overflow: 'auto',
              p: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0
              }}
            >
              {textContent || 'No content'}
            </Typography>
          </Box>
        );

      default:
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              gap: 2
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Preview not available for this file type
            </Typography>
            <Typography variant="body2" color="text.disabled">
              File type: {file.mimeType || 'Unknown'}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}
      >
        <Typography variant="h6" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Download file" placement="bottom" arrow>
            <IconButton edge="end" color="inherit" onClick={handleDownload} aria-label="download" size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close" size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
}
