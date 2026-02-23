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
} from '@mui/material';
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
  const [lastContactAnchor, setLastContactAnchor] = useState<HTMLElement | null>(null);
  const [quickEdit, setQuickEdit] = useState<{ key: string; label: string; anchorEl: HTMLElement } | null>(null);
  const [quickEditDraft, setQuickEditDraft] = useState('');
  const [mapHeight, setMapHeight] = useState(260);
  const [centerMapOnAddress, setCenterMapOnAddress] = useState<string | null>(null);
  const resizeRef = useRef<{ startY: number; startMapH: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const propertyAddressString = [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ');

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
  const formatTime = (value: string) =>
    value ? new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '';

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
    const task: ContactTask = {
      id: `task-${Date.now()}`,
      title,
      dueDate: undefined,
      completed: false,
    };
    onUpdateContact({ ...contact, tasks: [...tasks, task] });
    setNewTaskTitle('');
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
              <Typography variant="h6" gutterBottom>
                {contact.name}
              </Typography>
              <Chip
                label={contact.status === 'Lead' ? 'New Lead' : contact.status}
                size="small"
                color={contact.status === 'Active' ? 'success' : contact.status === 'Lead' ? 'primary' : 'default'}
                variant="outlined"
              />
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
                <Typography
                  component="button"
                  type="button"
                  variant="caption"
                  onClick={() => setCenterMapOnAddress(propertyAddressString)}
                  sx={{ color: 'primary.main', cursor: 'pointer', border: 'none', background: 'none', font: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                >
                  View on map
                </Typography>
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
                    onClick={clickableAddress ? () => setCenterMapOnAddress(propertyAddressString) : undefined}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: 'calc(100vh - 180px)' }}>
          <Paper sx={{ p: 2, overflow: 'hidden', flexShrink: 0, height: mapHeight }}>
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

          {/* Tasks */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TaskIcon fontSize="small" /> Tasks
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              To-dos for this contact.
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              {tasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No tasks yet.</Typography>
              ) : (
                tasks.map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
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
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? 'text.secondary' : 'text.primary',
                      }}
                    >
                      {task.title}
                      {task.dueDate && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({formatDate(task.dueDate)})
                        </Typography>
                      )}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => handleDeleteTask(task.id)} aria-label="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <TextField
                size="small"
                fullWidth
                placeholder="New task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
              />
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddTask}>
                Add
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};

export default ContactDetailView;
