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
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  AutoFixHigh as AutomationIcon,
  Timeline as WorkflowIcon,
  Email as EmailIcon,
  Assignment as TaskIcon,
  Notifications as NotificationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  Pause as PauseIcon,
  Assessment as AnalyticsIcon,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Workflow {
  id: number;
  name: string;
  type: 'email' | 'task' | 'notification';
  status: 'active' | 'paused' | 'draft';
  triggers: string[];
  actions: string[];
  executionCount: number;
  successRate: number;
  lastRun: string;
}

const sampleWorkflows: Workflow[] = [
  {
    id: 1,
    name: 'Lead Follow-up Sequence',
    type: 'email',
    status: 'active',
    triggers: ['New Lead Created', 'Lead Status Changed'],
    actions: ['Send Welcome Email', 'Create Follow-up Task', 'Set Reminder'],
    executionCount: 245,
    successRate: 98,
    lastRun: '2024-03-15T10:30:00',
  },
  {
    id: 2,
    name: 'Property Viewing Reminder',
    type: 'notification',
    status: 'active',
    triggers: ['Viewing Scheduled'],
    actions: ['Send SMS Reminder', 'Send Email Confirmation'],
    executionCount: 89,
    successRate: 100,
    lastRun: '2024-03-15T14:20:00',
  },
  {
    id: 3,
    name: 'Deal Pipeline Update',
    type: 'task',
    status: 'paused',
    triggers: ['Deal Stage Updated'],
    actions: ['Update Pipeline', 'Notify Sales Manager'],
    executionCount: 156,
    successRate: 95,
    lastRun: '2024-03-14T16:45:00',
  },
];

const workflowStats = [
  { name: 'Active', value: 8 },
  { name: 'Paused', value: 3 },
  { name: 'Draft', value: 2 },
];

const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

const getWorkflowIcon = (type: Workflow['type']) => {
  switch (type) {
    case 'email':
      return <EmailIcon />;
    case 'task':
      return <TaskIcon />;
    case 'notification':
      return <NotificationIcon />;
    default:
      return <WorkflowIcon />;
  }
};

const getStatusColor = (status: Workflow['status']) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'draft':
      return 'default';
    default:
      return 'default';
  }
};

const AutomationWorkflows: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  return (
    <Box>
      {/* Overview Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutomationIcon />
          Automation & Workflows
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage automated processes, create workflow rules, and monitor their performance.
        </Typography>

        {/* Quick Stats */}
        <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Workflows
              </Typography>
              <Typography variant="h4">
                {sampleWorkflows.filter(w => w.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Executions
              </Typography>
              <Typography variant="h4">
                {sampleWorkflows.reduce((sum, w) => sum + w.executionCount, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Average Success Rate
              </Typography>
              <Typography variant="h4">
                {Math.round(sampleWorkflows.reduce((sum, w) => sum + w.successRate, 0) / sampleWorkflows.length)}%
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Workflow Status Distribution */}
        <Box sx={{ height: 300, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Workflow Status Distribution
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={workflowStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {workflowStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Workflows List */}
        <Typography variant="h6" gutterBottom>
          Active Workflows
        </Typography>
        <List>
          {sampleWorkflows.map((workflow) => (
            <React.Fragment key={workflow.id}>
              <ListItem>
                <ListItemIcon>
                  {getWorkflowIcon(workflow.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {workflow.name}
                      <Chip
                        label={workflow.status}
                        size="small"
                        color={getStatusColor(workflow.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        {workflow.triggers.map((trigger, index) => (
                          <Chip key={index} label={trigger} size="small" variant="outlined" />
                        ))}
                      </Stack>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Success Rate:
                        </Typography>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={workflow.successRate}
                            sx={{ flex: 1 }}
                          />
                          <Typography variant="body2">
                            {workflow.successRate}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title={workflow.status === 'active' ? 'Pause' : 'Run'}>
                    <IconButton edge="end" sx={{ mr: 1 }}>
                      {workflow.status === 'active' ? <PauseIcon /> : <RunIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton edge="end" sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton edge="end" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Analytics Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon />
          Workflow Analytics
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sampleWorkflows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="executionCount" fill="#8884d8" name="Executions" />
              <Bar dataKey="successRate" fill="#82ca9d" name="Success Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default AutomationWorkflows; 