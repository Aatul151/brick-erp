import {
  Box,
  Typography,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColumnMenu } from '@mui/x-data-grid';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useState, useMemo } from 'react';

// Empty state overlays
const EmptyStateOverlay = ({ title, message }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      py: 8,
      px: 2,
    }}
  >
    <Box
      sx={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 1,
      }}
    >
      <InboxIcon sx={{ fontSize: 40, color: 'primary.main' }} />
    </Box>
    <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500, textAlign: 'center' }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', maxWidth: 400 }}>
      {message}
    </Typography>
  </Box>
);

const CustomNoRowsOverlay = () => (
  <EmptyStateOverlay
    title="No data found"
    message="Start by adding your first item to get started."
  />
);

const CustomNoResultsOverlay = () => (
  <EmptyStateOverlay
    title="No results found"
    message="Try adjusting your filters or search terms to find what you're looking for."
  />
);

// Filter rows by global search
function filterRowsBySearchTerm(rows, columns, searchTerm, getRowId) {
  if (!searchTerm?.trim()) return rows;
  const searchLower = searchTerm.toLowerCase().trim();

  return rows.filter((row) =>
    columns.some((col) => {
      if (col.field === '__recordNo__' || col.type === 'actions') return false;
      let val = row[col.field];
      if (col.valueGetter) {
        try {
          const apiRef = {
            current: {
              getRowId: (r) => (getRowId ? String(getRowId(r)) : String(r?.id ?? r)),
              getSortedRows: () => rows,
              getSortedRowIds: () => rows.map((r) => (getRowId ? String(getRowId(r)) : String(r?.id ?? r))),
            },
          };
          val = col.valueGetter(null, row, col, apiRef);
        } catch {
          val = row[col.field];
        }
      }
      const str = val != null ? String(val).toLowerCase() : '';
      return str.includes(searchLower);
    })
  );
}

// Custom column menu - hide Sort
function CustomColumnMenu(props) {
  return (
    <GridColumnMenu
      {...props}
      slots={{
        columnMenuSortItem: null,
      }}
    />
  );
}

/**
 * AppDataTable - DataGrid-based table with global search, pagination, Record No column
 *
 * @param {Array} rows - Row data
 * @param {Array} columns - GridColDef columns (field, headerName, width, renderCell, etc.)
 * @param {Function} [getRowId] - (row) => id
 * @param {boolean} [loading] - Loading state
 * @param {number} [height] - Table height (default 500)
 * @param {boolean} [serverPagination] - Use server-side pagination
 * @param {number} [rowCount] - Total rows for server pagination
 * @param {object} [paginationModel] - { page, pageSize }
 * @param {Function} [onPaginationModelChange] - Pagination change handler
 * @param {boolean} [enableGlobalSearch] - Show search input (default true)
 * @param {string} [globalSearchPlaceholder] - Search placeholder
 */
export function AppDataTable({
  rows = [],
  columns = [],
  getRowId = (row) => row.id,
  loading = false,
  height = 500,
  serverPagination = false,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  enableGlobalSearch = true,
  globalSearchPlaceholder = 'Search all fields...',
  pageSizeOptions = [5, 10, 25, 50, 100],
  initialPageSize = 10,
  /** Field name of column that should flex to fill remaining space. If unset, width is divided among all columns by their width values. */
  flexColumn,
  sx,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Record No column
  const recordNoColumn = {
    field: '__recordNo__',
    headerName: 'No',
    width: 70,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    align: 'center',
    headerAlign: 'center',
    valueGetter: (_value, row, _col, apiRef) => {
      const currentRowId = apiRef.current.getRowId(row);
      const sortedIds = apiRef.current.getSortedRowIds();
      const idx = sortedIds.indexOf(currentRowId);
      if (serverPagination && paginationModel) {
        return paginationModel.page * paginationModel.pageSize + idx + 1;
      }
      return idx + 1;
    },
  };

  const columnsWithRecordNo = useMemo(() => {
    const cols = [recordNoColumn, ...columns];
    const hasFlex = cols.some((c) => c.flex);
    if (hasFlex) return cols;
    if (flexColumn) {
      const targetField = flexColumn;
      return cols.map((col) => {
        if (col.field !== targetField) return col;
        const { width, flex, minWidth, ...rest } = col;
        return { ...rest, flex: 1, minWidth: minWidth ?? width ?? 100 };
      });
    }
    return cols.map((col) => {
      if (col.field === '__recordNo__') return col;
      const { width, flex, minWidth, ...rest } = col;
      const base = width ?? 100;
      return { ...rest, flex: base, minWidth: minWidth ?? base };
    });
  }, [columns, flexColumn, serverPagination, paginationModel]);

  const filteredRows = useMemo(
    () => filterRowsBySearchTerm(rows, columnsWithRecordNo, globalSearchTerm, getRowId),
    [rows, columnsWithRecordNo, globalSearchTerm, getRowId]
  );

  const paginationProps = serverPagination
    ? {
        paginationMode: 'server',
        rowCount: rowCount ?? 0,
        paginationModel,
        onPaginationModelChange,
      }
    : {};

  const defaultSx = {
    borderRadius: 0,
    '& .MuiDataGrid-root': { borderRadius: 0 },
    '& .MuiDataGrid-cell': {
      borderBottom: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    '& .MuiDataGrid-cell[data-field="__recordNo__"]': {
      textAlign: 'center',
      justifyContent: 'center',
    },
    '& .MuiDataGrid-row:nth-of-type(odd)': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.02)
        : alpha(theme.palette.primary.main, 0.02),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
      },
    },
    '& .MuiDataGrid-row:nth-of-type(even)': {
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
      },
    },
  };

  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;

  const initialState = serverPagination
    ? {}
    : {
        pagination: {
          paginationModel: { pageSize: initialPageSize },
        },
      };

  return (
    <Box sx={{ height, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {enableGlobalSearch && (
        <Box sx={{ mb: 2, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {globalSearchTerm.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              Showing {filteredRows.length} of {rows.length} results
            </Typography>
          )}
          <TextField
            size="small"
            placeholder={globalSearchPlaceholder}
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {globalSearchTerm ? (
                    <IconButton size="small" onClick={() => setGlobalSearchTerm('')} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  <SearchIcon sx={{ ml: 1 }} fontSize="small" color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              width: isMobile ? '100%' : 300,
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.05)
                  : alpha(theme.palette.common.black, 0.02),
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={filteredRows}
          columns={columnsWithRecordNo}
          getRowId={getRowId}
          loading={loading}
          {...paginationProps}
          rowCount={serverPagination ? (rowCount ?? 0) : undefined}
          initialState={initialState}
          pageSizeOptions={pageSizeOptions}
          sx={mergedSx}
          slots={{
            noRowsOverlay: CustomNoRowsOverlay,
            noResultsOverlay: CustomNoResultsOverlay,
            columnMenu: CustomColumnMenu,
          }}
          density="compact"
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
}
