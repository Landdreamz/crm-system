import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  TextField,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Person as ContactIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailedIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Assessment as StatsIcon,
  Save as SaveIcon,
  Edit as EditIcon,
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

/** Normalize to E.164 for Twilio (digits only, leading +). */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return digits ? '+' + digits : '';
}

interface DialerContact {
  id: number;
  name: string;
  phone: string;
  status?: 'pending' | 'completed' | 'failed' | 'scheduled';
  notes?: string;
  lastCall?: Date;
}

interface Contact extends DialerContact {
  status: 'pending' | 'completed' | 'failed' | 'scheduled';
}

interface CallStats {
  total: number;
  connected: number;
  duration: number;
  successRate: number;
}

const sampleContacts: Contact[] = [
  {
    id: 1,
    name: 'John Smith',
    phone: '(555) 123-4567',
    status: 'pending',
    notes: 'Interested in property viewing',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    phone: '(555) 234-5678',
    status: 'completed',
    notes: 'Follow up on offer',
    lastCall: new Date('2024-03-15T14:30:00'),
  },
  {
    id: 3,
    name: 'Michael Brown',
    phone: '(555) 345-6789',
    status: 'failed',
    notes: 'No answer - try again tomorrow',
    lastCall: new Date('2024-03-15T11:15:00'),
  },
  {
    id: 4,
    name: 'Emma Wilson',
    phone: '(555) 456-7890',
    status: 'scheduled',
    notes: 'Scheduled for tomorrow',
    lastCall: new Date('2024-03-16T10:00:00'),
  },
];

const dailyStats = [
  { day: 'Mon', calls: 45, connected: 32, duration: 128 },
  { day: 'Tue', calls: 52, connected: 38, duration: 145 },
  { day: 'Wed', calls: 48, connected: 35, duration: 132 },
  { day: 'Thu', calls: 50, connected: 40, duration: 150 },
  { day: 'Fri', calls: 47, connected: 36, duration: 140 },
];

const callStatusData = [
  { name: 'Connected', value: 75 },
  { name: 'No Answer', value: 15 },
  { name: 'Voicemail', value: 10 },
];

const COLORS = ['#00C49F', '#FF8042', '#FFBB28'];

const getStatusIcon = (status: Contact['status']) => {
  switch (status) {
    case 'completed':
      return <SuccessIcon color="success" />;
    case 'failed':
      return <FailedIcon color="error" />;
    case 'scheduled':
      return <ScheduleIcon color="primary" />;
    default:
      return <PhoneIcon />;
  }
};

const getStatusColor = (status: Contact['status']) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'scheduled':
      return 'primary';
    default:
      return 'default';
  }
};

const TWILIO_SDK_URL = 'https://sdk.twilio.com/js/client/release/1.14.0/twilio.min.js';
const DEFAULT_TWILIO_API = 'http://localhost:8000';

declare global {
  interface Window {
    Twilio?: {
      Device: new (token: string) => TwilioDevice;
    };
  }
}
interface TwilioDevice {
  connect: (params?: { params?: Record<string, string> }) => void;
  disconnect: () => void;
  on: (event: string, handler: () => void) => void;
  destroy: () => void;
}

interface PowerDialerProps {
  /** CRM contacts to show in the dialer; when not provided, sample data is used. */
  contacts?: { id: number; name: string; phone: string }[];
}

const PowerDialer: React.FC<PowerDialerProps> = ({ contacts: crmContacts }) => {
  const [activeCall, setActiveCall] = useState<DialerContact | null>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [twilioReady, setTwilioReady] = useState(false);
  const [twilioError, setTwilioError] = useState<string | null>(null);
  const deviceRef = useRef<TwilioDevice | null>(null);

  const apiBase = typeof process !== 'undefined' && process.env.REACT_APP_TWILIO_API_URL
    ? process.env.REACT_APP_TWILIO_API_URL
    : DEFAULT_TWILIO_API;

  const displayContacts: Contact[] = crmContacts?.length
    ? crmContacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone, status: 'pending' as const }))
    : sampleContacts;

  useEffect(() => {
    if (typeof window === 'undefined' || window.Twilio) {
      setTwilioReady(!!window.Twilio);
      return;
    }
    const script = document.createElement('script');
    script.src = TWILIO_SDK_URL;
    script.async = true;
    script.onload = () => setTwilioReady(!!window.Twilio);
    script.onerror = () => setTwilioError('Failed to load Twilio SDK');
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const handleStartCall = async (contact: DialerContact) => {
    const num = toE164(contact.phone);
    if (!num) {
      setTwilioError('No valid phone number');
      return;
    }
    setTwilioError(null);
    setActiveCall(contact);
    setIsDialing(true);
    try {
      const r = await fetch(`${apiBase}/api/twilio/token/`);
      let data: { token?: string; error?: string } = {};
      try {
        data = await r.json();
      } catch {
        setTwilioError(`Backend at ${apiBase} returned invalid JSON. Is the server running?`);
        setIsDialing(false);
        setActiveCall(null);
        return;
      }
      if (!r.ok) {
        setTwilioError(data.error || 'Could not get call token');
        setIsDialing(false);
        setActiveCall(null);
        return;
      }
      const token = data.token;
      if (!window.Twilio) {
        setTwilioError('Twilio SDK not loaded');
        setIsDialing(false);
        setActiveCall(null);
        return;
      }
      if (deviceRef.current) {
        try { deviceRef.current.destroy(); } catch { /* ignore */ }
        deviceRef.current = null;
      }
      const device = new window.Twilio.Device(token);
      deviceRef.current = device;
      device.on('connect', () => setIsDialing(false));
      device.on('disconnect', () => {
        setActiveCall(null);
        setIsDialing(false);
        if (deviceRef.current === device) deviceRef.current = null;
      });
      device.on('error', () => {
        setTwilioError('Call failed');
        setActiveCall(null);
        setIsDialing(false);
      });
      device.connect({ params: { To: num } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed';
      const isNetwork = /failed|load failed|network|refused/i.test(msg);
      setTwilioError(
        isNetwork
          ? `Cannot reach the backend at ${apiBase}. Start it with: cd backend && pip install -r requirements.txt && python manage.py runserver`
          : msg
      );
      setIsDialing(false);
      setActiveCall(null);
    }
  };

  const handleEndCall = () => {
    if (deviceRef.current) {
      try { deviceRef.current.disconnect(); deviceRef.current.destroy(); } catch { /* ignore */ }
      deviceRef.current = null;
    }
    setActiveCall(null);
    setIsDialing(false);
  };

  return (
    <Box>
      {/* Overview Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon />
          Power Dialer
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Efficiently manage and track your calls with automated dialing and call analytics.
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
          Calls use the backend at <strong>{apiBase}</strong>. Start the backend (see docs/TWILIO.md) and set Twilio env vars.
        </Typography>

        {/* Quick Stats */}
        <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Today's Calls
              </Typography>
              <Typography variant="h4">
                {dailyStats[dailyStats.length - 1].calls}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Connected Rate
              </Typography>
              <Typography variant="h4">
                {Math.round((dailyStats[dailyStats.length - 1].connected / dailyStats[dailyStats.length - 1].calls) * 100)}%
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Avg Call Duration
              </Typography>
              <Typography variant="h4">
                {Math.round(dailyStats[dailyStats.length - 1].duration / dailyStats[dailyStats.length - 1].connected)}m
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {twilioError && (
          <Alert severity="warning" onClose={() => setTwilioError(null)} sx={{ mb: 2 }}>
            {twilioError} — Ensure the backend is running and Twilio env vars are set (see docs/TWILIO.md).
          </Alert>
        )}

        {/* Active Call Section */}
        {activeCall && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'background.default' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <ContactIcon sx={{ fontSize: 40 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{activeCall.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeCall.phone}
                </Typography>
                {isDialing && (
                  <Box sx={{ width: '100%', mt: 1 }}>
                    <LinearProgress />
                    <Typography variant="caption" sx={{ mt: 0.5 }}>
                      Dialing...
                    </Typography>
                  </Box>
                )}
              </Box>
              <Button
                variant="contained"
                color="error"
                startIcon={<CallEndIcon />}
                onClick={handleEndCall}
              >
                End Call
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Call Queue */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Call Queue
          </Typography>
          <TextField
            fullWidth
            placeholder="Search contacts..."
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <List>
            {displayContacts
              .filter((c) => !searchText.trim() || c.name.toLowerCase().includes(searchText.toLowerCase()) || c.phone.includes(searchText))
              .map((contact) => (
              <React.Fragment key={contact.id}>
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(contact.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {contact.name}
                        <Chip
                          label={contact.status}
                          size="small"
                          color={getStatusColor(contact.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        {contact.phone}
                        {contact.notes && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {contact.notes}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Call">
                      <IconButton
                        edge="end"
                        onClick={() => handleStartCall(contact)}
                        disabled={!!activeCall}
                        sx={{ mr: 1 }}
                      >
                        <CallIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Notes">
                      <IconButton edge="end" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Save">
                      <IconButton edge="end">
                        <SaveIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Call Analytics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatsIcon />
            Call Analytics
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="calls" fill="#8884d8" name="Total Calls" />
                <Bar dataKey="connected" fill="#82ca9d" name="Connected" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Call Status Distribution */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Call Status Distribution
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={callStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {callStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PowerDialer; 