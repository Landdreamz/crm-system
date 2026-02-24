import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  IconButton,
  Stack,
} from '@mui/material';
import TaskIcon from '@mui/icons-material/Task';
import PersonIcon from '@mui/icons-material/Person';
import type { Contact, ContactTask } from './types';
import { playTaskDueSound } from './taskNotificationSound';

const DUE_SOUND_PLAYED_KEY = 'crmTasksDueSoundPlayed';

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return isoDate;
  }
}

function formatShortDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

function getDueTasks(contacts: Contact[]): { contact: Contact; task: ContactTask }[] {
  const out: { contact: Contact; task: ContactTask }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const contact of contacts) {
    for (const task of contact.tasks ?? []) {
      if (task.completed) continue;
      if (!task.dueDate) continue;
      if (task.dueDate <= today) {
        out.push({ contact, task });
      }
    }
  }
  out.sort((a, b) => (a.task.dueDate ?? '').localeCompare(b.task.dueDate ?? ''));
  return out;
}

export interface TasksViewProps {
  contacts: Contact[];
  onOpenContact?: (contactId: number) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ contacts, onOpenContact }) => {
  const dueTasks = getDueTasks(contacts);
  const hasDue = dueTasks.length > 0;
  const playedRef = useRef(false);

  useEffect(() => {
    if (!hasDue || playedRef.current) return;
    try {
      const last = sessionStorage.getItem(DUE_SOUND_PLAYED_KEY);
      const now = Date.now();
      if (last && now - Number(last) < 60_000) return; // already played in last 60s
      sessionStorage.setItem(DUE_SOUND_PLAYED_KEY, String(now));
      playedRef.current = true;
      playTaskDueSound();
    } catch {
      playedRef.current = true;
    }
  }, [hasDue]);

  const upcomingTasks: { contact: Contact; task: ContactTask }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const contact of contacts) {
    for (const task of contact.tasks ?? []) {
      if (task.completed) continue;
      if (task.dueDate && task.dueDate >= today) {
        upcomingTasks.push({ contact, task });
      } else if (!task.dueDate) {
        upcomingTasks.push({ contact, task });
      }
    }
  }
  upcomingTasks.sort((a, b) => (a.task.dueDate ?? '9999-99-99').localeCompare(b.task.dueDate ?? '9999-99-99'));

  return (
    <Box sx={{ p: 2, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TaskIcon /> Tasks
      </Typography>

      {hasDue && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="error" fontWeight={600} gutterBottom>
            Due today or overdue ({dueTasks.length})
          </Typography>
          <List dense disablePadding>
            {dueTasks.map(({ contact, task }) => (
              <ListItem
                key={`${contact.id}-${task.id}`}
                disablePadding
                secondaryAction={
                  onOpenContact && (
                    <Button
                      size="small"
                      startIcon={<PersonIcon />}
                      onClick={() => onOpenContact(contact.id)}
                    >
                      Open contact
                    </Button>
                  )
                }
                sx={{ alignItems: 'flex-start', mb: 1 }}
              >
                <ListItemText
                  primary={task.title}
                  secondary={
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip size="small" label={task.dueDate ? formatDate(task.dueDate) : 'No date'} color="error" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">
                        {contact.name}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
        Upcoming / no date ({upcomingTasks.length})
      </Typography>
      {upcomingTasks.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No upcoming tasks. Add tasks from Contacts → open a contact → Tasks.
        </Typography>
      ) : (
        <List dense disablePadding>
          {upcomingTasks.slice(0, 20).map(({ contact, task }) => (
            <ListItem
              key={`${contact.id}-${task.id}`}
              disablePadding
              secondaryAction={
                onOpenContact && (
                  <IconButton size="small" onClick={() => onOpenContact(contact.id)} aria-label="Open contact">
                    <PersonIcon fontSize="small" />
                  </IconButton>
                )}
              sx={{ alignItems: 'flex-start', mb: 0.5 }}
            >
              <ListItemText
                primary={task.title}
                secondary={
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
                    {task.dueDate && (
                      <Chip size="small" label={formatShortDate(task.dueDate)} variant="outlined" />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {contact.name}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      {upcomingTasks.length > 20 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing 20 of {upcomingTasks.length} upcoming tasks.
        </Typography>
      )}
    </Box>
  );
};

export default TasksView;
