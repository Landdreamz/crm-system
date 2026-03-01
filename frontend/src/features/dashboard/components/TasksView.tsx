import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Stack,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Popover,
  TextField,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import TaskIcon from '@mui/icons-material/Task';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { Contact, ContactTask } from './types';
import { playTaskDueSound } from './taskNotificationSound';
import {
  loadTaskNotificationPrefs,
  saveTaskNotificationPrefs,
  requestNotificationPermission,
  showDueTasksBrowserNotification,
  type TaskNotificationPrefs,
} from './taskNotificationPrefs';

const DUE_SOUND_PLAYED_KEY = 'crmTasksDueSoundPlayed';
const DUE_BROWSER_NOTIFIED_KEY = 'crmTasksDueBrowserNotified';

type FilterOption = 'all' | 'overdue' | 'upcoming' | 'no_date';
type SortOption = 'due_date' | 'contact' | 'title';

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

/** Format HH:mm or HH:mm:ss to short time (e.g. "2:30 PM"). Accepts flexible digits and ISO time. */
function formatDueTime(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  // Match HH:mm or H:mm or HH:mm:ss (24h)
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) || 0;
    const d = new Date(2000, 0, 1, h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  // Already formatted like "2:30 PM" or similar - return as-is
  if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(trimmed)) return trimmed;
  // ISO time part (e.g. "14:30:00" from datetime string)
  const isoMatch = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    const h = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) || 0;
    const d = new Date(2000, 0, 1, h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return trimmed;
}

/** Get due time string from task (defensive - handles any shape). */
function getTaskDueTime(task: ContactTask): string {
  const t = task?.dueTime ?? (task as unknown as Record<string, unknown> | undefined)?.dueTime;
  if (t != null && t !== '' && typeof t === 'string') return String(t).trim();
  return '';
}

/** Full due date and time for a task (e.g. "Sep 26, 2025, 2:30 PM") */
function formatDueDateAndTime(task: ContactTask): string {
  const dateStr = task.dueDate ? formatDate(task.dueDate) : '';
  const timeStr = task.dueTime ? (formatDueTime(task.dueTime) || task.dueTime) : '';
  if (dateStr && timeStr) return `${dateStr}, ${timeStr}`;
  if (dateStr) return dateStr;
  if (timeStr) return timeStr;
  return '—';
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDaysFromToday(isoDate: string): number {
  const today = new Date(getToday());
  const d = new Date(isoDate);
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
}

function getUpcomingGroupLabel(isoDate: string | undefined): string {
  if (!isoDate) return 'No date';
  const days = getDaysFromToday(isoDate);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return 'This week';
  return 'Later';
}

export interface TaskItem {
  contact: Contact;
  task: ContactTask;
}

function getAllTaskItems(contacts: Contact[], includeCompleted: boolean): TaskItem[] {
  const out: TaskItem[] = [];
  for (const contact of contacts) {
    for (const task of contact.tasks ?? []) {
      if (!includeCompleted && task.completed) continue;
      out.push({ contact, task });
    }
  }
  return out;
}

function getDueTaskItems(contacts: Contact[], includeCompleted: boolean): TaskItem[] {
  const today = getToday();
  return getAllTaskItems(contacts, includeCompleted).filter(
    ({ task }) => !task.completed && task.dueDate && task.dueDate <= today
  );
}

function sortTaskItems(items: TaskItem[], sortBy: SortOption): TaskItem[] {
  const copy = [...items];
  if (sortBy === 'due_date') {
    copy.sort((a, b) => (a.task.dueDate ?? '9999-99-99').localeCompare(b.task.dueDate ?? '9999-99-99'));
  } else if (sortBy === 'contact') {
    copy.sort((a, b) => a.contact.name.localeCompare(b.contact.name));
  } else {
    copy.sort((a, b) => a.task.title.localeCompare(b.task.title));
  }
  return copy;
}

function groupUpcomingByLabel(items: TaskItem[], today: string): { label: string; items: TaskItem[] }[] {
  const groups: Record<string, TaskItem[]> = {};
  const order = ['Today', 'Tomorrow', 'This week', 'Later', 'No date'];
  for (const item of items) {
    const label = getUpcomingGroupLabel(item.task.dueDate);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return order.filter((l) => groups[l]?.length).map((label) => ({ label, items: groups[label] }));
}

export interface TasksViewProps {
  contacts: Contact[];
  onOpenContact?: (contactId: number) => void;
  onUpdateContact?: (contact: Contact) => void;
  /** If provided, TasksView will persist the updated contacts list directly so task dueTime is never lost */
  onPersistContacts?: (contacts: Contact[], crmId: string) => void;
  crmId?: string;
}

const TasksView: React.FC<TasksViewProps> = ({ contacts, onOpenContact, onUpdateContact, onPersistContacts, crmId }) => {
  const today = getToday();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_date');
  const [showCompleted, setShowCompleted] = useState(false);
  const [prefs, setPrefs] = useState<TaskNotificationPrefs>(() => loadTaskNotificationPrefs());
  const [editingTask, setEditingTask] = useState<{ item: TaskItem; draft: ContactTask; anchorEl: HTMLElement } | null>(null);
  /** Dedicated state for due time so we always have the current value when saving (avoids stale draft/ref) */
  const [editingDueTime, setEditingDueTime] = useState('');
  /** Cache of due time per task id so saved value shows immediately even before parent state updates */
  const [savedDueTimeByTaskId, setSavedDueTimeByTaskId] = useState<Record<string, string>>({});
  const playedRef = useRef(false);
  const browserNotifiedRef = useRef(false);

  useEffect(() => {
    if (editingTask) setEditingDueTime(editingTask.draft.dueTime ?? '');
  }, [editingTask]);

  const allItems = useMemo(() => getAllTaskItems(contacts, showCompleted), [contacts, showCompleted]);
  const dueItems = useMemo(
    () => sortTaskItems(getDueTaskItems(contacts, showCompleted), sortBy),
    [contacts, showCompleted, sortBy]
  );
  const upcomingOnly = useMemo(
    () => allItems.filter(({ task }) => !task.completed && (!task.dueDate || task.dueDate >= today)),
    [allItems, today]
  );
  const upcomingGrouped = useMemo(
    () => groupUpcomingByLabel(sortTaskItems(upcomingOnly, sortBy), today),
    [upcomingOnly, sortBy, today]
  );
  const upcomingGroupedFiltered = useMemo(() => {
    if (filter === 'no_date') return upcomingGrouped.filter((g) => g.label === 'No date');
    if (filter === 'upcoming') return upcomingGrouped.filter((g) => g.label !== 'No date');
    return upcomingGrouped;
  }, [filter, upcomingGrouped]);

  /** Single flat list for spreadsheet: apply filter then sort */
  const tableItems = useMemo(() => {
    let items: TaskItem[] = [];
    if (filter === 'all') {
      const dueIncomplete = dueItems.filter(({ task }) => !task.completed);
      items = [...dueIncomplete, ...upcomingOnly];
    } else if (filter === 'overdue') {
      items = dueItems.filter(({ task }) => !task.completed && task.dueDate && task.dueDate < today);
    } else if (filter === 'upcoming') {
      items = upcomingOnly.filter(({ task }) => task.dueDate);
    } else {
      items = upcomingOnly.filter(({ task }) => !task.dueDate);
    }
    return sortTaskItems(items, sortBy);
  }, [filter, dueItems, upcomingOnly, sortBy, today]);

  const hasDue = dueItems.some(({ task }) => !task.completed);

  // Sound: when there are due (incomplete) tasks, play once per 60s (existing behavior), respect prefs
  useEffect(() => {
    if (!hasDue || playedRef.current || !prefs.soundEnabled) return;
    try {
      const last = sessionStorage.getItem(DUE_SOUND_PLAYED_KEY);
      const now = Date.now();
      if (last && now - Number(last) < 60_000) return;
      sessionStorage.setItem(DUE_SOUND_PLAYED_KEY, String(now));
      playedRef.current = true;
      playTaskDueSound();
    } catch {
      playedRef.current = true;
    }
  }, [hasDue, prefs.soundEnabled]);

  // Browser notification: when there are due tasks and prefs allow, show once per session
  useEffect(() => {
    if (!hasDue || browserNotifiedRef.current || !prefs.browserEnabled) return;
    try {
      if (sessionStorage.getItem(DUE_BROWSER_NOTIFIED_KEY)) return;
      sessionStorage.setItem(DUE_BROWSER_NOTIFIED_KEY, '1');
      browserNotifiedRef.current = true;
      const count = dueItems.filter(({ task }) => !task.completed).length;
      showDueTasksBrowserNotification(count);
    } catch {
      browserNotifiedRef.current = true;
    }
  }, [hasDue, prefs.browserEnabled, dueItems.length]);

  const handleToggleTaskComplete = (item: TaskItem) => {
    if (!onUpdateContact) return;
    const updatedTasks = (item.contact.tasks ?? []).map((t) =>
      t.id === item.task.id ? { ...t, completed: !t.completed } : t
    );
    onUpdateContact({ ...item.contact, tasks: updatedTasks });
  };

  const handleBrowserNotifyToggle = async (enabled: boolean) => {
    const next = { ...prefs, browserEnabled: enabled };
    setPrefs(next);
    saveTaskNotificationPrefs(next);
    if (enabled) {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        setPrefs((p) => ({ ...p, browserEnabled: false }));
        saveTaskNotificationPrefs({ ...next, browserEnabled: false });
      }
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    const next = { ...prefs, soundEnabled: enabled };
    setPrefs(next);
    saveTaskNotificationPrefs(next);
  };

  const handleSaveTaskEdit = () => {
    if (!editingTask || !onUpdateContact) return;
    const { item, draft } = editingTask;
    if (!draft.title.trim()) return;
    const dueTimeVal = (editingDueTime ?? '').trim();
    const savedTask: ContactTask = {
      id: draft.id,
      title: draft.title.trim(),
      dueDate: (draft.dueDate ?? '').trim() || undefined,
      dueTime: dueTimeVal ? String(dueTimeVal) : undefined,
      completed: draft.completed,
    };
    const updatedTasks = (item.contact.tasks ?? []).map((t) => (t.id === draft.id ? savedTask : t));
    const updatedContact: Contact = { ...item.contact, tasks: updatedTasks };
    onUpdateContact(updatedContact);
    // Persist list with explicit task shape so dueTime is never dropped by JSON or merge
    if (onPersistContacts && crmId) {
      const nextList = contacts.map((c) => {
        if (c.id !== item.contact.id) return c;
        return {
          ...updatedContact,
          tasks: updatedTasks.map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            dueTime: t.dueTime,
            completed: t.completed,
          })),
        };
      });
      onPersistContacts(nextList, crmId);
    }
    setSavedDueTimeByTaskId((prev) => (dueTimeVal ? { ...prev, [draft.id]: dueTimeVal } : prev));
    setEditingDueTime('');
    setEditingTask(null);
  };

  /** Status: "Overdue" if due date has passed, otherwise "To Do" */
  const getStatusLabel = (item: TaskItem): string => {
    if (item.task.dueDate && item.task.dueDate < today) return 'Overdue';
    return 'To Do';
  };
  const getStatusColor = (item: TaskItem): 'error' | 'default' => {
    return getStatusLabel(item) === 'Overdue' ? 'error' : 'default';
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1200 }}>
      <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TaskIcon /> Tasks
      </Typography>

      {/* Notifications settings */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <NotificationsActiveIcon fontSize="small" /> Notifications
          </Typography>
          <Stack direction="row" alignItems="center" spacing={3} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  checked={prefs.browserEnabled}
                  onChange={(_, checked) => handleBrowserNotifyToggle(checked)}
                  color="primary"
                />
              }
              label="Browser notifications (when tasks are due)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={prefs.soundEnabled}
                  onChange={(_, checked) => handleSoundToggle(checked)}
                  color="primary"
                />
              }
              label="Sound alert"
            />
          </Stack>
          {prefs.browserEnabled && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'denied' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Notifications were blocked. Enable them in your browser for this site to get alerts.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Filters and sort */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filter}
            label="Filter"
            onChange={(e) => setFilter(e.target.value as FilterOption)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="overdue">Overdue only</MenuItem>
            <MenuItem value="upcoming">Upcoming only</MenuItem>
            <MenuItem value="no_date">No date</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <MenuItem value="due_date">Due date</MenuItem>
            <MenuItem value="contact">Contact name</MenuItem>
            <MenuItem value="title">Title</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={showCompleted}
              onChange={(_, checked) => setShowCompleted(checked)}
              size="small"
            />
          }
          label="Show completed"
        />
      </Stack>

      {/* Spreadsheet-style table */}
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader aria-label="Tasks">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              {onUpdateContact && (
                <TableCell padding="checkbox" sx={{ fontWeight: 600, width: 48 }}>
                  Done
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Lead owner</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Due date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Due time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              {(onOpenContact || onUpdateContact) && (
                <TableCell sx={{ fontWeight: 600, width: 140 }} align="right">
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + (onUpdateContact ? 1 : 0) + (onOpenContact || onUpdateContact ? 1 : 0)} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks match the filter. Add tasks from Contacts → open a contact → Tasks.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tableItems.map((item) => (
                <TableRow
                  key={`${item.contact.id}-${item.task.id}`}
                  hover
                  onClick={(e) => {
                    if (onUpdateContact && !(e.target as HTMLElement).closest('button')) {
                      setEditingTask({ item, draft: { ...item.task }, anchorEl: e.currentTarget });
                    }
                  }}
                  sx={{
                    opacity: item.task.completed ? 0.8 : 1,
                    cursor: onUpdateContact ? 'pointer' : 'default',
                    '&:nth-of-type(even)': { bgcolor: 'action.hover' },
                  }}
                >
                  {onUpdateContact && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleTaskComplete(item)}
                        aria-label={item.task.completed ? 'Mark incomplete' : 'Mark complete'}
                        color={item.task.completed ? 'success' : 'default'}
                      >
                        {item.task.completed ? (
                          <CheckCircleOutlineIcon fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: item.task.completed ? 'line-through' : 'none',
                      }}
                    >
                      {item.task.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.contact.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.contact.leadOwner ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.task.dueDate ? formatDate(item.task.dueDate) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {(() => {
                        const raw =
                          (item.task.dueTime ?? (item.task as unknown as Record<string, unknown>).dueTime) ||
                          savedDueTimeByTaskId[item.task.id] ||
                          '';
                        if (!raw || typeof raw !== 'string') return '—';
                        return formatDueTime(raw) || raw;
                      })()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getStatusLabel(item)}
                      color={getStatusColor(item)}
                      variant="outlined"
                    />
                  </TableCell>
                  {(onOpenContact || onUpdateContact) && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {onUpdateContact && (
                          <IconButton
                            size="small"
                            onClick={(e) => setEditingTask({ item, draft: { ...item.task }, anchorEl: e.currentTarget })}
                            aria-label="Edit task"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        )}
                        {onOpenContact && (
                          <Button
                            size="small"
                            startIcon={<PersonIcon />}
                            onClick={() => onOpenContact(item.contact.id)}
                            variant="outlined"
                          >
                            Open Contact
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit task popover — open when clicking a row or the Edit icon */}
      <Popover
        open={Boolean(editingTask)}
        anchorEl={editingTask?.anchorEl}
        onClose={() => setEditingTask(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {editingTask && (
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TaskIcon fontSize="small" /> Edit task · {editingTask.item.contact.name}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                size="small"
                label="Title"
                fullWidth
                value={editingTask.draft.title}
                onChange={(e) =>
                  setEditingTask((prev) => (prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : null))
                }
              />
              <TextField
                size="small"
                label="Due date"
                type="date"
                fullWidth
                value={editingTask.draft.dueDate ?? ''}
                onChange={(e) =>
                  setEditingTask((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, dueDate: e.target.value || undefined } } : null
                  )
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                label="Due time"
                type="text"
                fullWidth
                placeholder="e.g. 14:30 or 2:30 PM"
                value={editingDueTime}
                onChange={(e) => setEditingDueTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Completed</InputLabel>
                <Select
                  label="Completed"
                  value={editingTask.draft.completed ? 'yes' : 'no'}
                  onChange={(e: SelectChangeEvent<string>) =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, completed: e.target.value === 'yes' } } : null
                    )
                  }
                >
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={handleSaveTaskEdit}>
                  Save
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Popover>

      {tableItems.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {tableItems.length} task{tableItems.length !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
};

export default TasksView;
