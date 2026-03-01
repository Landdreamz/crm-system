import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Email as EmailIcon,
  Public as SocialIcon,
  LocalOffer as OfferIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as AnalyticsIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Campaign {
  id: number;
  name: string;
  type: 'email' | 'social' | 'offer';
  status: 'active' | 'scheduled' | 'completed' | 'draft';
  progress: number;
  reach: number;
  engagement: number;
  conversions: number;
  startDate: string;
  endDate: string;
}

const sampleCampaigns: Campaign[] = [
  {
    id: 1,
    name: 'Spring Property Showcase',
    type: 'email',
    status: 'active',
    progress: 65,
    reach: 2500,
    engagement: 42,
    conversions: 15,
    startDate: '2024-03-01',
    endDate: '2024-03-31',
  },
  {
    id: 2,
    name: 'Social Media Lead Generation',
    type: 'social',
    status: 'active',
    progress: 80,
    reach: 5000,
    engagement: 320,
    conversions: 45,
    startDate: '2024-02-15',
    endDate: '2024-04-15',
  },
  {
    id: 3,
    name: 'Summer Special Offer',
    type: 'offer',
    status: 'scheduled',
    progress: 0,
    reach: 0,
    engagement: 0,
    conversions: 0,
    startDate: '2024-06-01',
    endDate: '2024-08-31',
  },
];

const performanceData = [
  { month: 'Jan', leads: 120, conversions: 25, engagement: 450 },
  { month: 'Feb', leads: 150, conversions: 35, engagement: 520 },
  { month: 'Mar', leads: 200, conversions: 45, engagement: 600 },
  { month: 'Apr', leads: 180, conversions: 40, engagement: 550 },
];

const getCampaignIcon = (type: Campaign['type']) => {
  switch (type) {
    case 'email':
      return <EmailIcon />;
    case 'social':
      return <SocialIcon />;
    case 'offer':
      return <OfferIcon />;
    default:
      return <CampaignIcon />;
  }
};

const getStatusColor = (status: Campaign['status']) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'completed':
      return 'default';
    case 'draft':
      return 'warning';
    default:
      return 'default';
  }
};

const MarketingChannel: React.FC = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  return (
    <Box>
      {/* Overview Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CampaignIcon />
          Marketing Channels
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your marketing campaigns, track performance, and analyze results across different channels.
        </Typography>

        {/* Quick Stats */}
        <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Campaigns
              </Typography>
              <Typography variant="h4">
                {sampleCampaigns.filter(c => c.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Reach
              </Typography>
              <Typography variant="h4">
                {sampleCampaigns.reduce((sum, c) => sum + c.reach, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Conversions
              </Typography>
              <Typography variant="h4">
                {sampleCampaigns.reduce((sum, c) => sum + c.conversions, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Performance Chart */}
        <Box sx={{ height: 300, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Channel Performance
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#8884d8" name="Leads" />
              <Line type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />
              <Line type="monotone" dataKey="engagement" stroke="#ffc658" name="Engagement" />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Campaigns Table */}
        <Typography variant="h6" gutterBottom>
          Active Campaigns
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Campaign</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Reach</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCampaignIcon(campaign.type)}
                      <Typography>{campaign.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.type}
                      size="small"
                      icon={getCampaignIcon(campaign.type)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.status}
                      size="small"
                      color={getStatusColor(campaign.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={campaign.progress}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2">
                        {campaign.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{campaign.reach.toLocaleString()}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Campaign Analytics */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon />
          Campaign Analytics
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sampleCampaigns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="reach" fill="#8884d8" name="Reach" />
              <Bar dataKey="engagement" fill="#82ca9d" name="Engagement" />
              <Bar dataKey="conversions" fill="#ffc658" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default MarketingChannel; 