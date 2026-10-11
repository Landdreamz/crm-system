import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  Grid,
} from '@mui/material';
import {
  SmartToy as BotIcon,
  PlayArrow as ActivateIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface ChatBot {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'paused';
  channel: string;
  conversations: number;
}

const sampleBots: ChatBot[] = [
  {
    id: 1,
    name: 'Chief of Staff',
    description:
      'Your executive agent for the CRM—daily briefings, priorities, follow-ups, and coordination across pipeline, calendar, and tasks.',
    status: 'active',
    channel: 'CRM',
    conversations: 0,
  },
  {
    id: 2,
    name: 'Lead Qualifier',
    description: 'Qualifies inbound leads and routes hot prospects to your pipeline.',
    status: 'active',
    channel: 'Website',
    conversations: 128,
  },
  {
    id: 3,
    name: 'Follow-up Assistant',
    description: 'Sends timely follow-ups and answers common questions after first contact.',
    status: 'active',
    channel: 'SMS & Email',
    conversations: 84,
  },
  {
    id: 4,
    name: 'Listing Q&A',
    description: 'Answers property questions using your listing and market data.',
    status: 'draft',
    channel: 'Website',
    conversations: 0,
  },
  {
    id: 5,
    name: 'Appointment Scheduler',
    description: 'Books calls and site visits directly on your team calendar.',
    status: 'paused',
    channel: 'Website',
    conversations: 41,
  },
];

const statusColor: Record<ChatBot['status'], 'success' | 'default' | 'warning'> = {
  active: 'success',
  draft: 'default',
  paused: 'warning',
};

const ChatBots: React.FC = () => {
  const activeCount = sampleBots.filter((b) => b.status === 'active').length;
  const totalConversations = sampleBots.reduce((sum, b) => sum + b.conversations, 0);

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BotIcon />
          Chat Bots
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Configure automated assistants for your website, SMS, and email channels.
        </Typography>

        <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Bots
              </Typography>
              <Typography variant="h4">{activeCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Bots
              </Typography>
              <Typography variant="h4">{sampleBots.length}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Conversations
              </Typography>
              <Typography variant="h4">{totalConversations}</Typography>
            </CardContent>
          </Card>
        </Stack>

        <Button variant="contained" startIcon={<BotIcon />} sx={{ mb: 3 }}>
          Create chat bot
        </Button>

        <Grid container spacing={2}>
          {sampleBots.map((bot) => (
            <Grid item xs={12} md={6} key={bot.id}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Typography variant="h6">{bot.name}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {bot.name === 'Chief of Staff' && (
                        <Chip label="Agent" size="small" color="primary" variant="outlined" />
                      )}
                      <Chip label={bot.status} size="small" color={statusColor[bot.status]} />
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {bot.description}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Chip label={bot.channel} size="small" variant="outlined" />
                    <Chip label={`${bot.conversations} conversations`} size="small" variant="outlined" />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<SettingsIcon />} variant="outlined">
                      Configure
                    </Button>
                    {bot.status !== 'active' && (
                      <Button size="small" startIcon={<ActivateIcon />} variant="contained">
                        Activate
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ChatBots;
