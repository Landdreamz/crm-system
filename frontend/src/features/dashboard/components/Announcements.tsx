import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
}));

const priorityColors = {
  high: 'error',
  medium: 'warning',
  low: 'success',
} as const;

const mockAnnouncements: Announcement[] = [
  {
    id: 1,
    title: 'Q2 Sales Targets',
    content: 'New sales targets have been set for Q2. Team meeting scheduled for details.',
    date: '2024-03-15',
    priority: 'high',
  },
  {
    id: 2,
    title: 'New Product Launch',
    content: 'Enterprise solution launch scheduled for next month. Training sessions upcoming.',
    date: '2024-03-14',
    priority: 'medium',
  },
  {
    id: 3,
    title: 'System Maintenance',
    content: 'Scheduled maintenance this weekend. Plan accordingly.',
    date: '2024-03-13',
    priority: 'low',
  },
];

const Announcements: React.FC = () => {
  console.log('Rendering Announcements component'); // Debug log
  
  return (
    <StyledPaper>
      <Typography variant="h6" gutterBottom color="primary">
        Announcements
      </Typography>
      <List>
        {mockAnnouncements.map((announcement, index) => (
          <React.Fragment key={announcement.id}>
            <ListItem alignItems="flex-start">
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1">{announcement.title}</Typography>
                    <Chip
                      label={announcement.priority}
                      size="small"
                      color={priorityColors[announcement.priority]}
                    />
                  </Box>
                }
                secondary={
                  <React.Fragment>
                    <Typography variant="body2" color="text.primary" paragraph>
                      {announcement.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(announcement.date).toLocaleDateString()}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
            {index < mockAnnouncements.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </StyledPaper>
  );
};

export default Announcements; 