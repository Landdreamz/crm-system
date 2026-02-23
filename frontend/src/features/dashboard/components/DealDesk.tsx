import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface Deal {
  id: number;
  name: string;
  company: string;
  value: number;
  stage: 'Qualification' | 'Proposal' | 'Negotiation' | 'Closing';
  probability: number;
  expectedCloseDate: string;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
}));

const stageColors = {
  Qualification: '#4CAF50',
  Proposal: '#2196F3',
  Negotiation: '#FF9800',
  Closing: '#9C27B0',
};

const mockDeals: Deal[] = [
  {
    id: 1,
    name: 'Enterprise Solution Package',
    company: 'Tech Corp',
    value: 75000,
    stage: 'Negotiation',
    probability: 75,
    expectedCloseDate: '2024-04-15',
  },
  {
    id: 2,
    name: 'Annual License Renewal',
    company: 'Global Industries',
    value: 45000,
    stage: 'Closing',
    probability: 90,
    expectedCloseDate: '2024-03-30',
  },
  {
    id: 3,
    name: 'Software Implementation',
    company: 'Startup Inc',
    value: 25000,
    stage: 'Proposal',
    probability: 50,
    expectedCloseDate: '2024-05-01',
  },
];

const DealDesk: React.FC = () => {
  console.log('Rendering DealDesk component'); // Debug log
  
  return (
    <StyledPaper>
      <Typography variant="h6" gutterBottom color="primary">
        Deal Desk
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Deal</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell>Probability</TableCell>
              <TableCell>Expected Close</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockDeals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>{deal.name}</TableCell>
                <TableCell>{deal.company}</TableCell>
                <TableCell>${deal.value.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    label={deal.stage}
                    size="small"
                    style={{
                      backgroundColor: stageColors[deal.stage],
                      color: '#fff',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={deal.probability}
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="caption">{deal.probability}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(deal.expectedCloseDate).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </StyledPaper>
  );
};

export default DealDesk; 