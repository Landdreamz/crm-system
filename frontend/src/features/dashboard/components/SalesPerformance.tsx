import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import DealDesk from './DealDesk';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  height: '100%',
  marginBottom: theme.spacing(3),
}));

const SalesPerformance: React.FC = () => {
  console.log('Rendering SalesPerformance component');

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      {/* Metrics Section */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <StyledPaper>
            <Typography variant="h6">Total Revenue</Typography>
            <Typography variant="h4">$124,500</Typography>
            <Typography variant="body2" color="success.main">+12% from last month</Typography>
          </StyledPaper>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <StyledPaper>
            <Typography variant="h6">Deals Closed</Typography>
            <Typography variant="h4">45</Typography>
            <Typography variant="body2" color="success.main">+8% from last month</Typography>
          </StyledPaper>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <StyledPaper>
            <Typography variant="h6">Average Deal Size</Typography>
            <Typography variant="h4">$2,766</Typography>
            <Typography variant="body2" color="error.main">-3% from last month</Typography>
          </StyledPaper>
        </Box>
      </Box>

      {/* Deal Desk Section */}
      <Box sx={{ mb: 3 }}>
        <DealDesk />
      </Box>

      {/* Monthly Sales Trend Section */}
      <Box>
        <StyledPaper>
          <Typography variant="h6" gutterBottom>Monthly Sales Trend</Typography>
          {/* Chart component will be added here */}
        </StyledPaper>
      </Box>
    </Box>
  );
};

export default SalesPerformance; 