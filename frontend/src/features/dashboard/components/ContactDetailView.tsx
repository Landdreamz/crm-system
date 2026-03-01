import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Message as MessageIcon,
  Event as EventIcon,
  CheckCircle as TaskIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarMonthIcon,
  Refresh as RefreshIcon,
  EditOutlined as EditOutlinedIcon,
} from '@mui/icons-material';
import { Contact, Communication, Appointment, ContactTask } from './types';
import PropertyMap from './PropertyMap';

interface ContactDetailViewProps {
  contact: Contact;
  onBack: () => void;
  onEdit: (contact: Contact) => void;
  onUpdateContact: (updated: Contact) => void;
}

const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  contact,
  onBack,
  onEdit,
  onUpdateContact,
}) => {
  const [messageDraft, setMessageDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState(contact.notes ?? '');
  const [newAppointmentTitle, setNewAppointmentTitle] = useState('');
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [editingTask, setEditingTask] = useState<{ task: ContactTask; draft: ContactTask; anchorEl: HTMLElement } | null>(null);
  const [lastContactAnchor, setLastContactAnchor] = useState<HTMLElement | null>(null);
  const [quickEdit, setQuickEdit] = useState<{ key: string; label: string; anchorEl: HTMLElement } | null>(null);
  const [quickEditDraft, setQuickEditDraft] = useState('');
  const [mapHeight, setMapHeight] = useState(260);
  const [centerMapOnAddress, setCenterMapOnAddress] = useState<string | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const resizeRef = useRef<{ startY: number; startMapH: number } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const apiBase = typeof process !== 'undefined' && process.env.REACT_APP_TWILIO_API_URL
    ? process.env.REACT_APP_TWILIO_API_URL
    : 'http://localhost:8000';

  const handleRefreshFromGhl = async () => {
    if (refreshLoading) return;
    const gohlId = contact.gohlId;
    const email = (contact.email || '').trim();
    if (!gohlId && !email) {
      setRefreshError('No GoHighLevel link (import from GHL first).');
      return;
    }
    setRefreshError(null);
    setRefreshSuccess(false);
    setRefreshLoading(true);
    try {
      const params = new URLSearchParams();
      if (gohlId) params.set('gohlId', gohlId);
      else params.set('email', email);
      const r = await fetch(`${apiBase}/api/gohl/contacts/refresh/?${params.toString()}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRefreshError(data.error || `Refresh failed (${r.status})`);
        return;
      }
      const fromGhl = data.contact as Record<string, unknown> | undefined;
      const fromGhlComms = (data.communications || []) as Array<{ date: string; direction: string; body: string }>;
      if (fromGhl) {
        const updated: Contact = {
          ...contact,
          name: (fromGhl.name as string) ?? contact.name,
          firstName: (fromGhl.firstName as string) ?? contact.firstName,
          lastName: (fromGhl.lastName as string) ?? contact.lastName,
          email: (fromGhl.email as string) ?? contact.email,
          phone: (fromGhl.phone as string) ?? contact.phone,
          company: (fromGhl.company as string) ?? contact.company,
          fullAddress: (fromGhl.fullAddress as string) ?? contact.fullAddress,
          address: (fromGhl.address as string) ?? contact.address,
          city: (fromGhl.city as string) ?? contact.city,
          state: (fromGhl.state as string) ?? contact.state,
          zip: (fromGhl.zip as string) ?? contact.zip,
          county: (fromGhl.county as string) ?? contact.county,
          apn: (fromGhl.apn as string) ?? contact.apn,
          lotSizeSqft: (fromGhl.lotSizeSqft as string) ?? contact.lotSizeSqft,
          acres: (fromGhl.acres as string) ?? contact.acres,
          estimatedValue: (fromGhl.estimatedValue as string) ?? contact.estimatedValue,
          propertyType: (fromGhl.propertyType as string) ?? contact.propertyType,
          subdivision: (fromGhl.subdivision as string) ?? contact.subdivision,
          totalAssessedValue: (fromGhl.totalAssessedValue as string) ?? contact.totalAssessedValue,
          latitude: (fromGhl.latitude as string) ?? contact.latitude,
          longitude: (fromGhl.longitude as string) ?? contact.longitude,
          gohlId: (fromGhl.gohlId as string) ?? contact.gohlId,
        };
        const existingComms = contact.communications ?? [];
        const existingIds = new Set(existingComms.map((c) => c.id));
        const newComms: Communication[] = fromGhlComms.map((msg, i) => ({
          id: `ghl-${msg.date}-${i}`,
          date: msg.date,
          direction: (msg.direction === 'out' ? 'out' : 'in') as 'out' | 'in',
          body: msg.body,
        })).filter((c) => !existingIds.has(c.id));
        const mergedComms = [...existingComms];
        for (const c of newComms) {
          if (mergedComms.some((x) => x.date === c.date && x.body === c.body)) continue;
          mergedComms.push(c);
        }
        mergedComms.sort((a, b) => a.date.localeCompare(b.date));
        onUpdateContact({ ...updated, communications: mergedComms });
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Refresh failed';
      const isNetwork = /failed|load failed|network|refused|cors/i.test(msg);
      setRefreshError(isNetwork ? `Cannot reach backend. Is it running at ${apiBase}?` : msg);
    } finally {
      setRefreshLoading(false);
    }
  };

  const propertyAddressString = (contact.fullAddress && contact.fullAddress.trim())
    ? contact.fullAddress.trim()
    : [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ');

  // Geocoder-friendly format: "street, city, state zip" (zip helps US Census accuracy)
  const stateZip = [contact.state, contact.zip].filter(Boolean).join(' ').trim();
  const geocodeAddressString = [contact.address, contact.city, stateZip].filter(Boolean).join(', ') || propertyAddressString;

  // When "View on map" is clicked, scroll the map into view so the user sees the result
  useEffect(() => {
    if (centerMapOnAddress && mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [centerMapOnAddress]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startMapH: mapHeight };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const MIN_MAP_HEIGHT = 80;
  const getMaxMapHeight = () => Math.max(400, typeof window !== 'undefined' ? window.innerHeight - 220 : 800);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const dy = e.clientY - resizeRef.current.startY;
      const next = resizeRef.current.startMapH + dy;
      setMapHeight((prev) => Math.min(getMaxMapHeight(), Math.max(MIN_MAP_HEIGHT, next)));
    };
    const handleUp = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const isDateKey = (k: string) => k === 'lastContact' || k === 'salesDate';

  const openQuickEdit = (key: string, label: string, e: React.MouseEvent<HTMLElement>) => {
    let val = (contact as unknown as Record<string, unknown>)[key];
    let draft = val != null ? String(val) : '';
    if (isDateKey(key) && draft) {
      try { draft = new Date(draft).toISOString().slice(0, 10); } catch { /* keep draft */ }
    }
    setQuickEditDraft(draft);
    setQuickEdit({ key, label, anchorEl: e.currentTarget });
  };

  const saveQuickEdit = () => {
    if (!quickEdit) return;
    onUpdateContact({ ...contact, [quickEdit.key]: quickEditDraft });
    setQuickEdit(null);
  };

  useEffect(() => {
    setNotesDraft(contact.notes ?? '');
  }, [contact.id, contact.notes]);

  const communications = contact.communications ?? [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [communications.length]);

  const formatDate = (value: string) =>
    value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
  const formatShortDate = (value: string) =>
    value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const formatTime = (value: string) =>
    value ? new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '';
  /** Format HH:mm or HH:mm:ss to short time (e.g. "2:30 PM"). Accepts flexible digits. */
  const formatDueTime = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match) return trimmed;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) || 0;
    const d = new Date(2000, 0, 1, h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  /** Full due date + time for display (e.g. "Sep 26, 2025 at 2:30 PM") */
  const formatDueDateTime = (task: ContactTask) => {
    if (task.dueDate && task.dueTime) {
      const timeDisplay = formatDueTime(task.dueTime) || task.dueTime;
      return `${formatDate(task.dueDate)} at ${timeDisplay}`;
    }
    if (task.dueDate) return formatDate(task.dueDate);
    if (task.dueTime) return `Time: ${formatDueTime(task.dueTime) || task.dueTime}`;
    return '';
  };
  /** Get due as Date for countdown; if no time, use end of day */
  const getDueDate = (task: ContactTask): Date | null => {
    if (!task.dueDate) return null;
    const [y, m, d] = task.dueDate.split('-').map(Number);
    if (task.dueTime && /^\d{1,2}:\d{2}/.test(task.dueTime)) {
      const [h, min] = task.dueTime.split(':').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, 0, 0);
    }
    return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
  };
  /** Countdown text: "Due in X days, Y hours, Z minutes" or "Overdue by ..." */
  const getCountdown = (due: Date, now: Date): string => {
    const diffMs = due.getTime() - now.getTime();
    const totalMins = Math.floor(Math.abs(diffMs) / 60000);
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
    const str = parts.join(', ');
    return diffMs < 0 ? `Overdue by ${str}` : `Due in ${str}`;
  };

  const handleSendMessage = () => {
    const trimmed = messageDraft.trim();
    if (!trimmed) return;
    const newMsg: Communication = {
      id: `msg-${Date.now()}`,
      date: new Date().toISOString(),
      direction: 'out',
      body: trimmed,
    };
    onUpdateContact({
      ...contact,
      communications: [...communications, newMsg],
    });
    setMessageDraft('');
  };

  const handleSaveNotes = () => {
    if (notesDraft !== (contact.notes ?? '')) {
      onUpdateContact({ ...contact, notes: notesDraft });
    }
  };

  const appointments = contact.appointments ?? [];
  const tasks = contact.tasks ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aDue = a.dueDate ?? '9999-99-99';
    const bDue = b.dueDate ?? '9999-99-99';
    return aDue.localeCompare(bDue);
  });

  const handleAddAppointment = () => {
    const title = newAppointmentTitle.trim();
    const date = newAppointmentDate.trim();
    if (!title || !date) return;
    const apt: Appointment = {
      id: `apt-${Date.now()}`,
      title,
      date,
      time: undefined,
      notes: undefined,
    };
    onUpdateContact({ ...contact, appointments: [...appointments, apt] });
    setNewAppointmentTitle('');
    setNewAppointmentDate('');
  };

  const handleDeleteAppointment = (id: string) => {
    onUpdateContact({
      ...contact,
      appointments: appointments.filter((a) => a.id !== id),
    });
  };

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const dueDateVal = newTaskDueDate.trim() || undefined;
    const dueTimeVal = newTaskDueTime.trim() || undefined;
    const task: ContactTask = {
      id: `task-${Date.now()}`,
      title,
      dueDate: dueDateVal,
      dueTime: dueTimeVal,
      completed: false,
    };
    onUpdateContact({
      ...contact,
      tasks: [...tasks.map((t) => ({ ...t })), task],
    });
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskDueTime('');
  };

  const handleSaveTaskEdit = () => {
    if (!editingTask) return;
    const { draft } = editingTask;
    if (!draft.title.trim()) return;
    onUpdateContact({
      ...contact,
      tasks: tasks.map((t) => (t.id === draft.id ? draft : t)),
    });
    setEditingTask(null);
  };

  const handleToggleTask = (id: string) => {
    onUpdateContact({
      ...contact,
      tasks: tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    });
  };

  const handleDeleteTask = (id: string) => {
    onUpdateContact({ ...contact, tasks: tasks.filter((t) => t.id !== id) });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
        Back to contacts
      </Button>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr 320px' },
          gap: 2,
          alignItems: 'start',
          minHeight: 'calc(100vh - 180px)',
        }}
      >
        {/* Left: Contact info */}
        <Paper sx={{ p: 2, overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                <Typography variant="h6" component="span">
                  {contact.name}
                </Typography>
                {(contact.gohlId || contact.email) && (
                  <IconButton
                    size="small"
                    onClick={handleRefreshFromGhl}
                    disabled={refreshLoading}
                    aria-label="Refresh from GoHighLevel"
                    title="Refresh from GoHighLevel"
                  >
                    <RefreshIcon fontSize="small" sx={{ opacity: refreshLoading ? 0.6 : 1 }} />
                  </IconButton>
                )}
              </Stack>
              <Chip
                label={contact.status === 'Lead' ? 'New Lead' : contact.status}
                size="small"
                color={contact.status === 'Active' ? 'success' : contact.status === 'Lead' ? 'primary' : 'default'}
                variant="outlined"
              />
              {refreshError && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{refreshError}</Typography>
              )}
              {refreshSuccess && (
                <Typography variant="caption" color="success" sx={{ display: 'block', mt: 0.5 }}>Refreshed from GoHighLevel</Typography>
              )}
            </Box>
            <IconButton color="primary" size="small" onClick={() => onEdit(contact)} aria-label="Edit contact">
              <EditIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.5}>
            {[
              { key: 'phone', label: 'Phone', value: contact.phone, link: 'tel' },
              { key: 'email', label: 'Email', value: contact.email, link: 'mailto' },
              { key: 'company', label: 'Company', value: contact.company },
              { key: 'leadOwner', label: 'Lead Owner', value: contact.leadOwner ?? '' },
            ].map(({ key, label, value, link }) => (
              <Box key={key}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <IconButton size="small" onClick={(e) => openQuickEdit(key, label, e)} sx={{ p: 0.25 }} aria-label={`Edit ${label}`}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
                <Typography variant="body2" component={link && value ? 'a' : 'span'} href={link && value ? `${link}:${value}` : undefined} sx={link && value ? { color: 'primary.main' } : undefined}>
                  {value || '—'}
                </Typography>
              </Box>
            ))}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">Last contact</Typography>
                <IconButton size="small" onClick={(e) => openQuickEdit('lastContact', 'Last contact', e)} sx={{ p: 0.25 }} aria-label="Edit Last contact">
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
              <Typography
                variant="body2"
                onClick={(e) => setLastContactAnchor(e.currentTarget)}
                sx={{ cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 0.5, '&:hover': { color: 'primary.main' } }}
              >
                {formatDate(contact.lastContact)}
                <CalendarMonthIcon sx={{ fontSize: 18, opacity: 0.7 }} />
              </Typography>
              <Popover open={Boolean(lastContactAnchor)} anchorEl={lastContactAnchor} onClose={() => setLastContactAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Pick last contact date</Typography>
                  <TextField type="date" size="small" value={contact.lastContact || ''} onChange={(e) => { const v = e.target.value; if (v) onUpdateContact({ ...contact, lastContact: v }); }} onBlur={() => setLastContactAnchor(null)} inputProps={{ 'aria-label': 'Last contact date' }} InputLabelProps={{ shrink: true }} sx={{ mt: 0.5 }} />
                </Box>
              </Popover>
            </Box>

            {[
              { key: 'ownsMultiple', label: 'Owns multiple?' },
              { key: 'phone2', label: 'Phone 2' },
              { key: 'phone3', label: 'Phone 3' },
              { key: 'phone4', label: 'Phone 4' },
              { key: 'phone5', label: 'Phone 5' },
              { key: 'phone6', label: 'Phone 6' },
              { key: 'phone7', label: 'Phone 7' },
              { key: 'phone8', label: 'Phone 8' },
              { key: 'phone9', label: 'Phone 9' },
              { key: 'phone10', label: 'Phone 10' },
            ].map(({ key, label }) => {
              const value = (contact as unknown as Record<string, unknown>)[key];
              const str = value != null ? String(value) : '';
              return (
                <Box key={key}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <IconButton size="small" onClick={(e) => openQuickEdit(key, label, e)} sx={{ p: 0.25 }} aria-label={`Edit ${label}`}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                  <Typography variant="body2" component={label.startsWith('Phone') && str ? 'a' : 'span'} href={label.startsWith('Phone') && str ? `tel:${str}` : undefined} sx={label.startsWith('Phone') && str ? { color: 'primary.main' } : undefined}>
                    {str || '—'}
                  </Typography>
                </Box>
              );
            })}

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Mailing</Typography>
            {[
              { key: 'mailingAddress', label: 'Mailing Address' },
              { key: 'mailingCity', label: 'Mailing City' },
              { key: 'mailingState', label: 'Mailing State' },
              { key: 'mailingZip', label: 'Mailing Zip' },
            ].map(({ key, label }) => (
              <Box key={key}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <IconButton size="small" onClick={(e) => openQuickEdit(key, label, e)} sx={{ p: 0.25 }} aria-label={`Edit ${label}`}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
                <Typography variant="body2">{(contact as unknown as Record<string, unknown>)[key] != null ? String((contact as unknown as Record<string, unknown>)[key]) : '—'}</Typography>
              </Box>
            ))}

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">Property</Typography>
              {propertyAddressString && (
                <Button
                  size="small"
                  variant="text"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCenterMapOnAddress(geocodeAddressString);
                    setTimeout(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
                  }}
                  sx={{ minWidth: 0, p: 0, textTransform: 'none', fontSize: '0.75rem', color: 'primary.main' }}
                >
                  View on map
                </Button>
              )}
            </Stack>
            {[
              { key: 'address', label: 'Address', isAddressLine: true },
              { key: 'city', label: 'City' },
              { key: 'state', label: 'State' },
              { key: 'zip', label: 'Zip' },
              { key: 'county', label: 'County' },
              { key: 'propertyType', label: 'Property Type' },
              { key: 'lotSizeSqft', label: 'Lot Size (sqft)' },
              { key: 'acres', label: 'Acres' },
              { key: 'subdivision', label: 'Subdivision' },
              { key: 'totalAssessedValue', label: 'Total Assessed Value' },
              { key: 'estimatedValue', label: 'Estimated Value' },
              { key: 'apn', label: 'APN' },
              { key: 'topography', label: 'Topography' },
              { key: 'latitude', label: 'Latitude' },
              { key: 'longitude', label: 'Longitude' },
            ].map(({ key, label, isAddressLine }) => {
              const value = (contact as unknown as Record<string, unknown>)[key];
              const str = value != null ? String(value) : '';
              const clickableAddress = isAddressLine && propertyAddressString;
              return (
                <Box key={key}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <IconButton size="small" onClick={(e) => openQuickEdit(key, label, e)} sx={{ p: 0.25 }} aria-label={`Edit ${label}`}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                  <Typography
                    variant="body2"
                    component={clickableAddress ? 'button' : 'span'}
                    type={clickableAddress ? 'button' : undefined}
                    onClick={clickableAddress ? () => setCenterMapOnAddress(geocodeAddressString) : undefined}
                    sx={{
                      ...(clickableAddress && {
                        border: 'none', background: 'none', padding: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer',
                        color: 'primary.main', '&:hover': { textDecoration: 'underline' },
                      }),
                    }}
                  >
                    {str || '—'}
                  </Typography>
                </Box>
              );
            })}

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Tax &amp; sales</Typography>
            {[
              { key: 'taxDelinquent', label: 'Tax Delinquent' },
              { key: 'taxDelinquentYear', label: 'Tax Delinquent Year' },
              { key: 'taxAmountDue', label: 'Tax Amount Due' },
              { key: 'salesPrice', label: 'Sales Price' },
              { key: 'salesDate', label: 'Sales Date' },
            ].map(({ key, label }) => (
              <Box key={key}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <IconButton size="small" onClick={(e) => openQuickEdit(key, label, e)} sx={{ p: 0.25 }} aria-label={`Edit ${label}`}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
                <Typography variant="body2">{key === 'salesDate' && contact.salesDate ? formatDate(contact.salesDate) : (contact as unknown as Record<string, unknown>)[key] != null ? String((contact as unknown as Record<string, unknown>)[key]) : '—'}</Typography>
              </Box>
            ))}

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">Data Source</Typography>
                <IconButton size="small" onClick={(e) => openQuickEdit('dataSource', 'Data Source', e)} sx={{ p: 0.25 }} aria-label="Edit Data Source">
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
              <Typography variant="body2">{contact.dataSource || '—'}</Typography>
            </Box>

            {/* Quick edit popover */}
            <Popover
              open={Boolean(quickEdit)}
              anchorEl={quickEdit?.anchorEl}
              onClose={() => setQuickEdit(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              {quickEdit && (
                <Box sx={{ p: 2, minWidth: 220 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Edit {quickEdit.label}</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    type={isDateKey(quickEdit.key) ? 'date' : 'text'}
                    value={quickEditDraft}
                    onChange={(e) => setQuickEditDraft(e.target.value)}
                    InputLabelProps={isDateKey(quickEdit.key) ? { shrink: true } : undefined}
                    sx={{ mb: 1.5 }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => setQuickEdit(null)}>Cancel</Button>
                    <Button size="small" variant="contained" onClick={saveQuickEdit}>Save</Button>
                  </Stack>
                </Box>
              )}
            </Popover>
          </Stack>
        </Paper>

        {/* Center: Map + Communications (resizable) */}
        <Box ref={mapSectionRef} sx={{ display: 'flex', flexDirection: 'column', minWidth: { md: 360 }, minHeight: 400, height: 'calc(100vh - 180px)' }}>
          <Paper sx={{ p: 2, overflow: 'hidden', flexShrink: 0, height: mapHeight, minHeight: 260 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Map</Typography>
            <PropertyMap
              contact={contact}
              height={mapHeight - 32}
              centerOnAddress={centerMapOnAddress}
              onCentered={() => setCenterMapOnAddress(null)}
            />
          </Paper>
          <Box
            onMouseDown={handleResizeStart}
            sx={{
              height: 10,
              flexShrink: 0,
              cursor: 'ns-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            title="Drag to resize map and message area"
          >
            <Box sx={{ width: 48, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
          </Box>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 200, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MessageIcon fontSize="small" /> Communications
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Message history with this contact
            </Typography>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                mb: 1.5,
                minHeight: 180,
                maxHeight: 'none',
              }}
            >
              {communications.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No messages yet. Send a message below.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {communications.map((msg) => (
                    <Box
                      key={msg.id}
                      sx={{
                        alignSelf: msg.direction === 'out' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        bgcolor: msg.direction === 'out' ? 'primary.main' : 'action.hover',
                        color: msg.direction === 'out' ? 'primary.contrastText' : 'text.primary',
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        borderTopRightRadius: msg.direction === 'out' ? 0 : 8,
                        borderTopLeftRadius: msg.direction === 'in' ? 0 : 8,
                      }}
                    >
                      <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                        {msg.direction === 'out' ? 'You' : contact.name} · {formatTime(msg.date)}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.body}
                      </Typography>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton color="primary" onClick={handleSendMessage} disabled={!messageDraft.trim()} size="small">
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </Box>

        {/* Right: Notes, Appointments, Tasks */}
        <Stack spacing={2} sx={{ minWidth: 0, overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {/* Notes */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
              Notes
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Team notes for this lead / contact.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              maxRows={8}
              placeholder="Follow-ups, preferences, deal status..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={handleSaveNotes}
              size="small"
              sx={{ '& .MuiInputBase-root': { alignItems: 'flex-start' } }}
            />
            <Button variant="contained" size="small" onClick={handleSaveNotes} sx={{ mt: 1.5 }}>
              Save notes
            </Button>
          </Paper>

          {/* Appointments */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EventIcon fontSize="small" /> Appointments
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Meetings and scheduled events.
            </Typography>
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {appointments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No appointments yet.</Typography>
              ) : (
                appointments.map((apt) => (
                  <Box
                    key={apt.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 1,
                      py: 0.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{apt.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(apt.date)}
                        {apt.time ? ` · ${apt.time}` : ''}
                      </Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleDeleteAppointment(apt.id)} aria-label="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <TextField
                size="small"
                placeholder="Title"
                value={newAppointmentTitle}
                onChange={(e) => setNewAppointmentTitle(e.target.value)}
                sx={{ flex: 1, minWidth: 100 }}
              />
              <TextField
                type="date"
                size="small"
                value={newAppointmentDate}
                onChange={(e) => setNewAppointmentDate(e.target.value)}
                placeholder="Pick date"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 0.5 }}>
                      <CalendarMonthIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ 'aria-label': 'Appointment date' }}
                sx={{
                  minWidth: 160,
                  '& .MuiInputBase-root': { cursor: 'pointer' },
                  '& input': { cursor: 'pointer' },
                }}
              />
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddAppointment}>
                Add
              </Button>
            </Stack>
          </Paper>

          {/* Tasks — aligned with Tasks tab */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TaskIcon fontSize="small" /> Tasks
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Same tasks appear on the Tasks tab. Add due dates to see them there.
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              {sortedTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No tasks yet.</Typography>
              ) : (
                sortedTasks.map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      opacity: task.completed ? 0.8 : 1,
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleToggleTask(task.id)}
                      sx={{ p: 0.25 }}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: task.completed ? 'primary.main' : 'action.disabled',
                          bgcolor: task.completed ? 'primary.main' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {task.completed && <Typography sx={{ color: 'primary.contrastText', fontSize: 12 }}>✓</Typography>}
                      </Box>
                    </IconButton>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {task.title}
                      </Typography>
                      {(task.dueDate || task.dueTime) && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }} flexWrap="wrap">
                          <Typography
                            variant="caption"
                            sx={{
                              color: task.dueDate && task.dueDate <= today ? 'error.main' : 'text.secondary',
                            }}
                          >
                            Due: {formatDueDateTime(task)}
                          </Typography>
                          {task.dueTime && (
                            <Chip
                              size="small"
                              label={formatDueTime(task.dueTime) || task.dueTime}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          {task.dueDate && task.dueDate < today && !task.completed && (
                            <Chip size="small" label="Overdue" color="error" sx={{ height: 18 }} />
                          )}
                        </Stack>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => setEditingTask({ task, draft: { ...task }, anchorEl: e.currentTarget })}
                      aria-label="Edit task"
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteTask(task.id)} aria-label="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </Stack>
            <Stack spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="New task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                inputProps={{ 'aria-label': 'Task title' }}
              />
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <TextField
                  size="small"
                  label="Due date"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                  inputProps={{ 'aria-label': 'Due date' }}
                />
                <TextField
                  size="small"
                  label="Due time"
                  type="time"
                  value={newTaskDueTime}
                  onChange={(e) => setNewTaskDueTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 120 }}
                  inputProps={{ 'aria-label': 'Due time', step: 300 }}
                />
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddTask} sx={{ alignSelf: 'flex-end' }}>
                  Add task
                </Button>
              </Stack>
            </Stack>
            {/* Countdown to next due task */}
            {(() => {
              const nextDue = sortedTasks.find((t) => !t.completed && t.dueDate);
              const dueDate = nextDue ? getDueDate(nextDue) : null;
              if (!dueDate) return null;
              const countdownText = getCountdown(dueDate, now);
              const isOverdue = dueDate.getTime() < now.getTime();
              return (
                <Box
                  sx={{
                    mt: 2,
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    Next due: {nextDue!.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: isOverdue ? 'error.main' : 'primary.main' }}
                  >
                    {countdownText}
                  </Typography>
                </Box>
              );
            })()}

            {/* Edit task popover — same fields as Tasks tab */}
            <Popover
              open={Boolean(editingTask)}
              anchorEl={editingTask?.anchorEl}
              onClose={() => setEditingTask(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              {editingTask && (
                <Box sx={{ p: 2, minWidth: 260 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TaskIcon fontSize="small" /> Edit task
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      size="small"
                      label="Title"
                      fullWidth
                      value={editingTask.draft.title}
                      onChange={(e) => setEditingTask((prev) => prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : null)}
                    />
                    <TextField
                      size="small"
                      label="Due date"
                      type="date"
                      fullWidth
                      value={editingTask.draft.dueDate ?? ''}
                      onChange={(e) => setEditingTask((prev) => prev ? { ...prev, draft: { ...prev.draft, dueDate: e.target.value || undefined } } : null)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ 'aria-label': 'Task due date' }}
                    />
                    <TextField
                      size="small"
                      label="Due time"
                      type="time"
                      fullWidth
                      value={editingTask.draft.dueTime ?? ''}
                      onChange={(e) => setEditingTask((prev) => prev ? { ...prev, draft: { ...prev.draft, dueTime: e.target.value || undefined } } : null)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ 'aria-label': 'Task due time', step: 300 }}
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
                      <Button size="small" onClick={() => setEditingTask(null)}>Cancel</Button>
                      <Button size="small" variant="contained" onClick={handleSaveTaskEdit}>Save</Button>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Popover>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};

export default ContactDetailView;
