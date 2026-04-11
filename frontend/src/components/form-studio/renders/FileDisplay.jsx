import { useState } from 'react';
import { Box, Typography, Link, IconButton, Tooltip } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AppPopover } from '../../common/AppPopover';
import { FilePreviewDialog } from '../../common/FilePreviewDialog';
import { downloadFile } from '../../../utils/fileDownload';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * File field display for grids / renderer — mirrors saas-core FileDisplay + FilePreviewDialog.
 * Uses AuthContext `getAccessToken()` for every preview/download (Bearer). Optional `getAccessToken` prop overrides for tests or embeds.
 */
export function FileDisplay({ fieldValue, onDownloadError, getAccessToken: getAccessTokenProp }) {
  const { getAccessToken: getAccessTokenFromAuth } = useAuth();
  const getAccessToken = getAccessTokenProp ?? getAccessTokenFromAuth;

  const [previewFile, setPreviewFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = (file, e) => {
    e?.stopPropagation?.();
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  const previewDialog = (
    <FilePreviewDialog
      open={previewOpen}
      file={previewFile}
      onClose={handleClosePreview}
      onDownloadError={onDownloadError}
      getAccessToken={getAccessToken}
    />
  );

  if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
    return (
      <>
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          No files
        </Typography>
        {previewDialog}
      </>
    );
  }

  let files = [];
  if (Array.isArray(fieldValue)) {
    files = fieldValue.filter((f) => f && typeof f === 'object' && f.fileUrl);
  } else if (typeof fieldValue === 'object' && fieldValue.fileUrl) {
    files = [fieldValue];
  }

  if (files.length === 0) {
    return (
      <>
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          No files
        </Typography>
        {previewDialog}
      </>
    );
  }

  if (files.length === 1) {
    const fileData = files[0];
    const displayName = fileData.originalName || fileData.fileName || 'Download file';

    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={`Click to download: ${displayName}`} placement="bottom" arrow>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(fileData.fileUrl, displayName, onDownloadError, getAccessToken());
              }}
              sx={{
                textAlign: 'left',
                color: 'primary.main',
                textDecoration: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '0.75rem',
                fontWeight: 500,
                textOverflow: 'ellipsis',
                width: '200px',
                overflow: 'hidden',
                border: 'none',
                background: 'none',
                padding: 0,
                font: 'inherit',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.dark'
                }
              }}
            >
              {displayName}
            </Link>
          </Tooltip>
          <Tooltip title="Preview file" placement="bottom" arrow>
            <IconButton
              size="small"
              onClick={(e) => handlePreview(fileData, e)}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {previewDialog}
      </>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center' }}>
        <AppPopover
          trigger={
            <Link
              component="button"
              type="button"
              variant="body2"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: '0.775rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                border: 'none',
                background: 'none',
                padding: 0,
                font: 'inherit',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.dark'
                }
              }}
            >
              <InsertDriveFileIcon sx={{ fontSize: 16 }} />
              View files ({files.length})
            </Link>
          }
          title={`All Files (${files.length})`}
          maxWidth={300}
          maxHeight={400}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {files.map((fileData, index) => {
              const displayName = fileData.originalName || fileData.fileName || `File ${index + 1}`;
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.75,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Tooltip title={displayName} placement="bottom" arrow>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(fileData.fileUrl, displayName, onDownloadError, getAccessToken());
                        }}
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '200px',
                          whiteSpace: 'nowrap',
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          font: 'inherit',
                          textAlign: 'left'
                        }}
                      >
                        {index + 1}. {displayName}
                      </Link>
                    </Tooltip>
                  </Box>
                  <Tooltip title="Preview file" placement="bottom" arrow>
                    <IconButton
                      size="small"
                      onClick={(e) => handlePreview(fileData, e)}
                      sx={{
                        flexShrink: 0,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        </AppPopover>
      </Box>
      {previewDialog}
    </>
  );
}
