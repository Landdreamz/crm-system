import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Select,
  MenuItem,
  SelectChangeEvent,
  Popover,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  CheckCircle as TaskIcon,
  DragIndicator as DragIndicatorIcon,
  ViewColumn as ViewColumnIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import AddContactDialog from './AddContactDialog';
import ContactDetailView from './ContactDetailView';
import { loadPipelines, DEFAULT_STAGES } from './PipelineManagement';
import type { StageDef } from './PipelineManagement';
import { Contact, NewContact, Appointment, ContactTask, PipelineStage } from './types';

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDueTime(timeStr: string): string {
  if (!timeStr || !/^\d{1,2}:\d{2}/.test(timeStr)) return '';
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(2000, 0, 1, h, m ?? 0).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getUpcomingAppointment(contact: Contact): Appointment | null {
  const list = contact.appointments ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const future = list.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return future[0] ?? null;
}

function getUpcomingTask(contact: Contact): ContactTask | null {
  const list = (contact.tasks ?? []).filter((t) => !t.completed);
  const today = new Date().toISOString().slice(0, 10);
  const withDue = list.filter((t) => t.dueDate);
  const withoutDue = list.filter((t) => !t.dueDate);
  const sorted = [...withDue].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  return sorted[0] ?? withoutDue[0] ?? null;
}

const STORAGE_KEY_PREFIX = 'crmContacts';
const COLUMN_ORDER_KEY_PREFIX = 'crmContactsColumnOrder';
const VISIBLE_COLUMNS_KEY_PREFIX = 'crmContactsVisibleColumns';

function getContactsStorageKey(crmId: string) {
  return `${STORAGE_KEY_PREFIX}_${crmId}`;
}
function getColumnOrderKey(crmId: string) {
  return `${COLUMN_ORDER_KEY_PREFIX}_${crmId}`;
}
function getVisibleColumnsKey(crmId: string) {
  return `${VISIBLE_COLUMNS_KEY_PREFIX}_${crmId}`;
}

type ColumnId =
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'status'
  | 'stage'
  | 'pipeline'
  | 'tags'
  | 'fullAddress'
  | 'temperature'
  | 'leadOwner'
  | 'lastContact'
  | 'upcomingTask'
  | 'upcomingAppointment'
  | 'ownsMultiple'
  | 'phone2'
  | 'phone3'
  | 'phone4'
  | 'phone5'
  | 'phone6'
  | 'phone7'
  | 'phone8'
  | 'phone9'
  | 'phone10'
  | 'mailingAddress'
  | 'mailingCity'
  | 'mailingState'
  | 'mailingZip'
  | 'propertyType'
  | 'lotSizeSqft'
  | 'totalAssessedValue'
  | 'subdivision'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'county'
  | 'latitude'
  | 'longitude'
  | 'apn'
  | 'estimatedValue'
  | 'topography'
  | 'acres'
  | 'taxDelinquent'
  | 'taxDelinquentYear'
  | 'taxAmountDue'
  | 'salesPrice'
  | 'askingPrice'
  | 'salesDate'
  | 'dataSource'
  | 'actions';

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  'name',
  'email',
  'phone',
  'company',
  'status',
  'stage',
  'pipeline',
  'tags',
  'fullAddress',
  'temperature',
  'leadOwner',
  'lastContact',
  'upcomingTask',
  'upcomingAppointment',
  'ownsMultiple',
  'phone2',
  'phone3',
  'phone4',
  'phone5',
  'phone6',
  'phone7',
  'phone8',
  'phone9',
  'phone10',
  'mailingAddress',
  'mailingCity',
  'mailingState',
  'mailingZip',
  'propertyType',
  'lotSizeSqft',
  'totalAssessedValue',
  'subdivision',
  'address',
  'city',
  'state',
  'zip',
  'county',
  'latitude',
  'longitude',
  'apn',
  'estimatedValue',
  'topography',
  'acres',
  'taxDelinquent',
  'taxDelinquentYear',
  'taxAmountDue',
  'salesPrice',
  'askingPrice',
  'salesDate',
  'dataSource',
  'actions',
];

const COLUMN_LABELS: Record<ColumnId, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  status: 'Status',
  stage: 'Stage',
  pipeline: 'Pipeline',
  tags: 'Tags',
  fullAddress: 'Full Address',
  temperature: 'Temperature',
  leadOwner: 'Lead Owner',
  lastContact: 'Last Contact',
  upcomingTask: 'Upcoming Task',
  upcomingAppointment: 'Upcoming Appointment',
  ownsMultiple: 'Owns multiple?',
  phone2: 'Phone 2',
  phone3: 'Phone 3',
  phone4: 'Phone 4',
  phone5: 'Phone 5',
  phone6: 'Phone 6',
  phone7: 'Phone 7',
  phone8: 'Phone 8',
  phone9: 'Phone 9',
  phone10: 'Phone 10',
  mailingAddress: 'Mailing Address',
  mailingCity: 'Mailing City',
  mailingState: 'Mailing State',
  mailingZip: 'Mailing Zip',
  propertyType: 'Property Type',
  lotSizeSqft: 'Lot Size (sqft)',
  totalAssessedValue: 'Total Assessed Value',
  subdivision: 'Subdivision',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'Zip',
  county: 'County',
  latitude: 'Latitude',
  longitude: 'Longitude',
  apn: 'APN',
  estimatedValue: 'Estimated Value',
  topography: 'Topography',
  acres: 'Acres',
  taxDelinquent: 'Tax Delinquent',
  taxDelinquentYear: 'Tax Delinquent Year',
  taxAmountDue: 'Tax Amount Due',
  salesPrice: 'Sales Price',
  askingPrice: 'Asking Price',
  salesDate: 'Sales Date',
  dataSource: 'Data Source',
  actions: 'Actions',
};

const NUMERIC_COLUMNS: Set<ColumnId> = new Set<ColumnId>([
  'lotSizeSqft', 'totalAssessedValue', 'acres', 'taxAmountDue', 'salesPrice', 'askingPrice', 'estimatedValue',
  'latitude', 'longitude',
]);
const DATE_COLUMNS: Set<ColumnId> = new Set<ColumnId>(['lastContact', 'salesDate', 'taxDelinquentYear']);

/** Stage options for a pipeline; use stage.id for value and stage.label for display. */
function getStageOptionsForPipeline(pipelineId: string | undefined, pipelineOptions: { id: string; stages?: StageDef[] }[]): StageDef[] {
  if (!pipelineId) return DEFAULT_STAGES;
  const pipeline = pipelineOptions.find((p) => p.id === pipelineId);
  return pipeline?.stages?.length ? pipeline.stages : DEFAULT_STAGES;
}

const TEMPERATURE_OPTIONS = ['Hot', 'Warm', 'Cold'] as const;

function getSortValue(contact: Contact, columnId: ColumnId): string | number | null {
  if (columnId === 'upcomingTask' || columnId === 'upcomingAppointment' || columnId === 'actions') return null;
  if (columnId === 'stage') return String(contact.pipelineStages?.[contact.pipeline ?? 'default'] ?? contact.pipelineStage ?? 'Lead').toLowerCase();
  if (columnId === 'pipeline') return String(contact.pipeline ?? '').toLowerCase();
  if (columnId === 'tags') return (contact.tags ?? []).join(', ').toLowerCase();
  if (columnId === 'fullAddress') return String(contact.fullAddress ?? '').toLowerCase();
  if (columnId === 'temperature') return String(contact.temperature ?? '').toLowerCase();
  const raw = (contact as unknown as Record<string, unknown>)[columnId];
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return null;
  if (NUMERIC_COLUMNS.has(columnId)) {
    const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? null : n;
  }
  if (DATE_COLUMNS.has(columnId)) {
    const d = new Date(String(raw)).getTime();
    return Number.isNaN(d) ? null : d;
  }
  return String(raw).toLowerCase();
}

function loadColumnOrder(crmId: string): ColumnId[] {
  try {
    const key = getColumnOrderKey(crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnId[];
      if (Array.isArray(parsed) && parsed.length === DEFAULT_COLUMN_ORDER.length) return parsed;
      const valid = new Set(DEFAULT_COLUMN_ORDER);
      const merged = parsed.filter((id) => valid.has(id));
      DEFAULT_COLUMN_ORDER.forEach((id) => {
        if (!merged.includes(id)) merged.push(id);
      });
      return merged;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_COLUMN_ORDER];
}

function saveColumnOrder(order: ColumnId[], crmId: string) {
  try {
    localStorage.setItem(getColumnOrderKey(crmId), JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

function loadVisibleColumns(crmId: string): ColumnId[] {
  try {
    const key = getVisibleColumnsKey(crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnId[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = new Set(DEFAULT_COLUMN_ORDER);
        return parsed.filter((id) => valid.has(id));
      }
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_COLUMN_ORDER];
}

function saveVisibleColumns(ids: ColumnId[], crmId: string) {
  try {
    localStorage.setItem(getVisibleColumnsKey(crmId), JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

const defaultContacts: Contact[] = [
  { id: 1, name: 'John Doe', email: 'john.doe@example.com', phone: '+1 (555) 123-4567', company: 'Tech Corp', status: 'Active', lastContact: '2024-03-15' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1 (555) 234-5678', company: 'Design Co', status: 'Lead', lastContact: '2024-03-14' },
];

export function loadContacts(crmId: string): Contact[] {
  try {
    const key = getContactsStorageKey(crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Contact[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return defaultContacts;
}

export function saveContacts(list: Contact[], crmId: string) {
  try {
    localStorage.setItem(getContactsStorageKey(crmId), JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

interface ContactsProps {
  contacts?: Contact[];
  setContacts?: React.Dispatch<React.SetStateAction<Contact[]>>;
  selectedContactId?: number | null;
  setSelectedContactId?: React.Dispatch<React.SetStateAction<number | null>>;
  crmId?: string;
}

const Contacts: React.FC<ContactsProps> = ({
  contacts: contactsProp,
  setContacts: setContactsProp,
  selectedContactId: selectedContactIdProp,
  setSelectedContactId: setSelectedContactIdProp,
  crmId: crmIdProp = 'acq',
}) => {
  const crmId = crmIdProp ?? 'acq';
  const [internalContacts, setInternalContacts] = useState<Contact[]>(() => loadContacts(crmId));
  const isControlled = contactsProp !== undefined && setContactsProp !== undefined;
  const contacts = isControlled ? contactsProp! : internalContacts;
  const setContacts = isControlled ? setContactsProp! : setInternalContacts;
  const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null);
  const selectionControlled = selectedContactIdProp !== undefined && setSelectedContactIdProp !== undefined;
  const selectedContactId = selectionControlled ? (selectedContactIdProp ?? null) : internalSelectedId;
  const setSelectedContactId = selectionControlled ? setSelectedContactIdProp! : setInternalSelectedId;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Lead' | 'Active' | 'Inactive'>('All');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editingAppointment, setEditingAppointment] = useState<{
    contact: Contact;
    appointment: Appointment | null;
    draft: Appointment;
    anchorEl: HTMLElement;
  } | null>(null);
  const [editingTask, setEditingTask] = useState<{
    contact: Contact;
    task: ContactTask | null;
    draft: ContactTask;
    anchorEl: HTMLElement;
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => loadColumnOrder(crmId));
  const [visibleColumnIds, setVisibleColumnIds] = useState<ColumnId[]>(() => loadVisibleColumns(crmId));
  const [columnsPopoverAnchor, setColumnsPopoverAnchor] = useState<HTMLElement | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [editingCell, setEditingCell] = useState<{ contact: Contact; columnId: ColumnId; anchorEl: HTMLElement } | null>(null);
  const [cellEditDraft, setCellEditDraft] = useState('');
  const [sortBy, setSortBy] = useState<ColumnId | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [gohlImporting, setGohlImporting] = useState(false);
  const [gohlImportError, setGohlImportError] = useState<string | null>(null);
  const [gohlPickerOpen, setGohlPickerOpen] = useState(false);
  const [gohlContacts, setGohlContacts] = useState<Record<string, unknown>[]>([]);
  const [gohlSelected, setGohlSelected] = useState<Set<number>>(new Set());
  const [searchGohl, setSearchGohl] = useState(false);
  const [gohlSearchResults, setGohlSearchResults] = useState<Record<string, unknown>[]>([]);
  const [gohlSearchLoading, setGohlSearchLoading] = useState(false);
  const [gohlSearchSelected, setGohlSearchSelected] = useState<Set<number>>(new Set());

  const isDateColumn = (id: ColumnId) => id === 'lastContact' || id === 'salesDate';

  const apiBase = typeof process !== 'undefined' && process.env.REACT_APP_TWILIO_API_URL
    ? process.env.REACT_APP_TWILIO_API_URL
    : 'http://localhost:8000';

  const openGohlPicker = async () => {
    setGohlImportError(null);
    setGohlImporting(true);
    setGohlPickerOpen(false);
    try {
      const r = await fetch(`${apiBase}/api/gohl/contacts/`);
      let data: { contacts?: unknown[]; error?: string } = {};
      try {
        data = await r.json();
      } catch {
        setGohlImportError(`Backend at ${apiBase} returned invalid JSON. Is the server running?`);
        return;
      }
      if (!r.ok) {
        setGohlImportError(data.error || `Import failed (${r.status})`);
        return;
      }
      const raw = (data.contacts ?? []).filter((c): c is Record<string, unknown> => c != null && typeof c === 'object');
      if (raw.length === 0) {
        setGohlImportError('No contacts returned from GoHighLevel');
        return;
      }
      setGohlContacts(raw);
      setGohlSelected(new Set());
      setGohlPickerOpen(true);
      setGohlImportError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      const isNetwork = /failed|load failed|network|refused|cors/i.test(msg);
      setGohlImportError(
        isNetwork
          ? `Cannot reach the backend at ${apiBase}. Start it with: cd backend && ./venv/bin/python manage.py runserver 0.0.0.0:8000`
          : msg
      );
    } finally {
      setGohlImporting(false);
    }
  };

  const toggleGohlSelected = (index: number) => {
    setGohlSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!searchGohl || searchTerm.trim().length < 2) {
      setGohlSearchResults([]);
      return;
    }
    const term = searchTerm.trim();
    const t = setTimeout(async () => {
      setGohlSearchLoading(true);
      try {
        const r = await fetch(`${apiBase}/api/gohl/contacts/?q=${encodeURIComponent(term)}`);
        const data = await r.json();
        if (r.ok && Array.isArray(data.contacts)) {
          setGohlSearchResults(data.contacts);
          setGohlSearchSelected(new Set());
        } else {
          setGohlSearchResults([]);
          setGohlSearchSelected(new Set());
        }
      } catch {
        setGohlSearchResults([]);
      } finally {
        setGohlSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchGohl, searchTerm, apiBase]);

  const toggleGohlSearchSelected = (i: number) => {
    setGohlSearchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const mapGohlToContact = (c: Record<string, unknown>, nextId: number): Contact => {
    const name = (c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' ')) as string;
    const email = String(c.email ?? '').trim();
    return {
      id: nextId,
      name: (name && String(name).trim()) || 'Unknown',
      firstName: (c.firstName as string) ?? undefined,
      lastName: (c.lastName as string) ?? undefined,
      email: email || '—',
      phone: String(c.phone ?? '').trim() || '—',
      company: String(c.company ?? '').trim() || '',
      status: 'Lead',
      lastContact: (c.lastContact as string) ?? new Date().toISOString().slice(0, 10),
      fullAddress: (c.fullAddress as string) ?? undefined,
      address: (c.address as string) ?? undefined,
      city: (c.city as string) ?? undefined,
      state: (c.state as string) ?? undefined,
      zip: (c.zip as string) ?? undefined,
      county: (c.county as string) ?? undefined,
      apn: (c.apn as string) ?? undefined,
      lotSizeSqft: (c.lotSizeSqft as string) ?? undefined,
      acres: (c.acres as string) ?? undefined,
      estimatedValue: (c.estimatedValue as string) ?? undefined,
      propertyType: (c.propertyType as string) ?? undefined,
      subdivision: (c.subdivision as string) ?? undefined,
      totalAssessedValue: (c.totalAssessedValue as string) ?? undefined,
      latitude: (c.latitude as string) ?? undefined,
      longitude: (c.longitude as string) ?? undefined,
      dataSource: 'GoHighLevel',
      gohlId: (c.gohlId ?? c._gohlId) as string | undefined,
    };
  };

  const importSelectedGohlSearchContacts = () => {
    const existingEmails = new Set(contacts.map((x) => x.email?.toLowerCase()).filter(Boolean));
    const maxId = Math.max(0, ...contacts.map((x) => x.id));
    let nextId = maxId + 1;
    const toAdd: Contact[] = [];
    for (const i of Array.from(gohlSearchSelected)) {
      const c = gohlSearchResults[i];
      if (!c) continue;
      const email = String(c.email ?? '').trim();
      if (email && existingEmails.has(email.toLowerCase())) continue;
      toAdd.push(mapGohlToContact(c, nextId++));
      if (email) existingEmails.add(email.toLowerCase());
    }
    setContacts((prev) => [...prev, ...toAdd]);
    setGohlSearchSelected(new Set());
  };

  const importSelectedGohlContacts = () => {
    const existingEmails = new Set(contacts.map((c) => c.email?.toLowerCase()).filter(Boolean));
    const maxId = Math.max(0, ...contacts.map((c) => c.id));
    let nextId = maxId + 1;
    const toAdd: Contact[] = [];
    for (const i of Array.from(gohlSelected)) {
      const c = gohlContacts[i];
      if (!c) continue;
      const email = (String(c.email ?? '').trim());
      if (email && existingEmails.has(email.toLowerCase())) continue;
      toAdd.push(mapGohlToContact(c, nextId++));
      if (email) existingEmails.add(email.toLowerCase());
    }
    setContacts((prev) => [...prev, ...toAdd]);
    setGohlPickerOpen(false);
    setGohlContacts([]);
    setGohlSelected(new Set());
  };

  const openCellEdit = (contact: Contact, columnId: ColumnId, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    let draft: string;
    if (columnId === 'stage') draft = contact.pipelineStages?.[contact.pipeline ?? 'default'] ?? contact.pipelineStage ?? 'Lead';
    else if (columnId === 'pipeline') draft = contact.pipeline ?? '';
    else if (columnId === 'tags') draft = (contact.tags ?? []).join(', ');
    else if (columnId === 'fullAddress') draft = contact.fullAddress ?? '';
    else if (columnId === 'temperature') draft = contact.temperature ?? '';
    else {
      const val = (contact as unknown as Record<string, unknown>)[columnId];
      draft = val != null ? String(val) : '';
      if (isDateColumn(columnId) && draft) {
        try { draft = new Date(draft).toISOString().slice(0, 10); } catch { /* keep */ }
      }
    }
    setCellEditDraft(draft);
    setEditingCell({ contact, columnId, anchorEl: e.currentTarget });
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    const { contact, columnId } = editingCell;
    if (columnId === 'stage') {
      const stageId = cellEditDraft.trim();
      const pipelineKey = contact.pipeline ?? 'default';
      handleUpdateContact({
        ...contact,
        pipelineStages: { [pipelineKey]: stageId },
        pipelineStage: stageId,
      });
    } else if (columnId === 'pipeline') {
      const newPipelineId = cellEditDraft.trim() === '' ? undefined : cellEditDraft.trim();
      if (newPipelineId == null) {
        handleUpdateContact({ ...contact, pipeline: undefined, pipelineStages: undefined, pipelineStage: undefined });
      } else {
        const firstStageId = pipelineOptions.find((p) => p.id === newPipelineId)?.stages?.[0]?.id ?? 'Lead';
        handleUpdateContact({
          ...contact,
          pipeline: newPipelineId,
          pipelineStages: { [newPipelineId]: firstStageId },
          pipelineStage: firstStageId,
        });
      }
    } else if (columnId === 'tags') {
      const tags = cellEditDraft.split(',').map((s) => s.trim()).filter(Boolean);
      handleUpdateContact({ ...contact, tags });
    } else if (columnId === 'fullAddress') {
      handleUpdateContact({ ...contact, fullAddress: cellEditDraft });
    } else if (columnId === 'temperature') {
      handleUpdateContact({ ...contact, temperature: cellEditDraft.trim() === '' ? undefined : cellEditDraft });
    } else {
      handleUpdateContact({ ...contact, [columnId]: cellEditDraft });
    }
    setEditingCell(null);
  };

  useEffect(() => {
    if (!isControlled) saveContacts(contacts, crmId);
  }, [contacts, isControlled, crmId]);

  useEffect(() => {
    saveColumnOrder(columnOrder, crmId);
  }, [columnOrder, crmId]);

  useEffect(() => {
    saveVisibleColumns(visibleColumnIds, crmId);
  }, [visibleColumnIds, crmId]);

  useEffect(() => {
    setColumnOrder(loadColumnOrder(crmId));
    setVisibleColumnIds(loadVisibleColumns(crmId));
    if (!isControlled) setInternalContacts(loadContacts(crmId));
  }, [crmId]);

  const visibleOrderedColumns = useMemo(
    () => columnOrder.filter((id) => visibleColumnIds.includes(id)),
    [columnOrder, visibleColumnIds]
  );

  const toggleColumnVisible = (id: ColumnId) => {
    setVisibleColumnIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id].sort((a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b))
    );
  };

  const handleColumnDragStart = (e: React.DragEvent, id: ColumnId) => {
    setDraggedColumn(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (e: React.DragEvent, targetId: ColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetId) return;
    setColumnOrder((prev) => {
      const from = prev.indexOf(draggedColumn);
      const to = prev.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedColumn);
      return next;
    });
  };

  const handleColumnDragEnd = () => setDraggedColumn(null);

  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (statusFilter !== 'All') list = list.filter((c) => c.status === statusFilter);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.email, c.phone, c.company, c.status].some((v) => String(v).toLowerCase().includes(term))
      );
    }
    return list;
  }, [contacts, statusFilter, searchTerm]);

  const sortedContacts = useMemo(() => {
    if (!sortBy || sortBy === 'actions' || sortBy === 'upcomingTask' || sortBy === 'upcomingAppointment') return filteredContacts;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredContacts].sort((a, b) => {
      const va = getSortValue(a, sortBy);
      const vb = getSortValue(b, sortBy);
      const emptyLast = (x: string | number | null) => (x == null ? 1 : 0);
      if (va == null && vb == null) return 0;
      if (va == null) return 1 * dir;
      if (vb == null) return -1 * dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
    });
  }, [filteredContacts, sortBy, sortDirection]);

  const handleHeaderClick = (id: ColumnId) => {
    if (id === 'actions' || id === 'upcomingTask' || id === 'upcomingAppointment') return;
    setPage(0);
    if (sortBy === id) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(id);
      setSortDirection('asc');
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleAddContact = (newContact: NewContact) => {
    const nextId = Math.max(0, ...contacts.map((c) => c.id)) + 1;
    const contact: Contact = { ...newContact, id: nextId };
    setContacts((prev) => [...prev, contact]);
    setIsAddDialogOpen(false);
  };

  const handleSaveContact = (updated: Contact) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
    setEditContact(null);
  };

  const handleDeleteContact = (contact: Contact) => {
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    setDeleteTarget(null);
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== updated.id) return c;
        return {
          ...c,
          ...updated,
          tasks: (updated.tasks ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            dueTime: t.dueTime,
            completed: t.completed,
          })),
        };
      })
    );
  };

  const handleStatusChange = (contact: Contact, event: SelectChangeEvent<string>) => {
    const status = event.target.value as Contact['status'];
    handleUpdateContact({ ...contact, status });
  };

  const handleStageChange = (contact: Contact, event: SelectChangeEvent<string>) => {
    const stageId = event.target.value;
    const pipelineKey = contact.pipeline ?? 'default';
    handleUpdateContact({
      ...contact,
      pipelineStages: { [pipelineKey]: stageId },
      pipelineStage: stageId,
    });
  };

  const handleTemperatureChange = (contact: Contact, event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    handleUpdateContact({ ...contact, temperature: value === '' ? undefined : value });
  };

  const [pipelineOptions, setPipelineOptions] = useState(() => loadPipelines(crmId));

  const handlePipelineChange = (contact: Contact, event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    if (value === '') {
      handleUpdateContact({ ...contact, pipeline: undefined, pipelineStages: undefined, pipelineStage: undefined });
    } else {
      const firstStageId = pipelineOptions.find((p) => p.id === value)?.stages?.[0]?.id ?? 'Lead';
      handleUpdateContact({
        ...contact,
        pipeline: value,
        pipelineStages: { [value]: firstStageId },
        pipelineStage: firstStageId,
      });
    }
  };

  const handleSaveAppointment = () => {
    if (!editingAppointment) return;
    const { contact, appointment, draft } = editingAppointment;
    if (!draft.title.trim() || !draft.date) return;
    const appointments = appointment
      ? (contact.appointments ?? []).map((a) => (a.id === draft.id ? draft : a))
      : [...(contact.appointments ?? []), draft];
    handleUpdateContact({ ...contact, appointments });
    setEditingAppointment(null);
  };

  const handleSaveTask = () => {
    if (!editingTask) return;
    const { contact, task, draft } = editingTask;
    if (!draft.title.trim()) return;
    const tasks = task
      ? (contact.tasks ?? []).map((t) => (t.id === draft.id ? draft : t))
      : [...(contact.tasks ?? []), draft];
    handleUpdateContact({ ...contact, tasks });
    setEditingTask(null);
  };

  const selectedContact = selectedContactId != null ? contacts.find((c) => c.id === selectedContactId) ?? null : null;

  const paginatedContacts = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedContacts.slice(start, start + rowsPerPage);
  }, [sortedContacts, page, rowsPerPage]);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  if (selectedContact) {
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <ContactDetailView
          contact={selectedContact}
          onBack={() => setSelectedContactId(null)}
          onEdit={(c) => setEditContact(c)}
          onUpdateContact={handleUpdateContact}
        />
        <AddContactDialog
          open={Boolean(editContact)}
          onClose={() => setEditContact(null)}
          onAdd={handleAddContact}
          editContact={editContact}
          onSave={handleSaveContact}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h5">Contacts</Typography>
          <Stack direction="column" spacing={1} alignItems="flex-end">
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setIsAddDialogOpen(true)}>
                Add contact
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={openGohlPicker}
                disabled={gohlImporting}
              >
                {gohlImporting ? 'Loading…' : 'Import from GoHighLevel'}
              </Button>
            </Stack>
            {gohlImportError && (
              <Typography variant="caption" color="error" sx={{ maxWidth: 320 }}>
                {gohlImportError}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewColumnIcon />}
              onClick={(e) => setColumnsPopoverAnchor(e.currentTarget)}
            >
              Choose columns
            </Button>
            <Popover
              open={Boolean(columnsPopoverAnchor)}
              anchorEl={columnsPopoverAnchor}
              onClose={() => setColumnsPopoverAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ p: 2, minWidth: 220, maxHeight: 360, overflowY: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Show columns</Typography>
                <Stack spacing={0.5}>
                  {(columnOrder as ColumnId[]).map((id) => (
                    <FormControlLabel
                      key={id}
                      control={
                        <Checkbox
                          checked={visibleColumnIds.includes(id)}
                          onChange={() => toggleColumnVisible(id)}
                          size="small"
                        />
                      }
                      label={COLUMN_LABELS[id]}
                    />
                  ))}
                </Stack>
              </Box>
            </Popover>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Stack direction="column" spacing={1} sx={{ maxWidth: 420 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ maxWidth: 320 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={searchGohl}
                    onChange={(e) => setSearchGohl(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">Search GoHighLevel</Typography>}
              />
            </Stack>
            {searchGohl && gohlSearchResults.length > 0 && gohlSearchSelected.size > 0 && (
              <Button
                size="small"
                variant="contained"
                onClick={importSelectedGohlSearchContacts}
                sx={{ alignSelf: 'flex-start' }}
              >
                Import {gohlSearchSelected.size === 1 ? '1 contact' : `${gohlSearchSelected.size} contacts`}
              </Button>
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>Status:</Typography>
            {(['All', 'Lead', 'Active', 'Inactive'] as const).map((status) => (
              <Chip
                key={status}
                label={status === 'Lead' ? 'New Lead' : status}
                size="small"
                onClick={() => setStatusFilter(status)}
                color={statusFilter === status ? 'primary' : 'default'}
                variant={statusFilter === status ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Stack>
        {searchGohl && (gohlSearchResults.length > 0 || gohlSearchLoading) && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              From GoHighLevel {gohlSearchLoading && '(searching…)'}
            </Typography>
            {gohlSearchResults.length > 0 && (
              <Stack spacing={0.5}>
                {gohlSearchResults.map((c, i) => {
                  const name = (c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' ')) as string;
                  const displayName = (name && String(name).trim()) || 'Unknown';
                  const email = String(c.email ?? '').trim();
                  const phone = String(c.phone ?? '').trim();
                  const alreadyExists = email
                    ? contacts.some((x) => x.email?.toLowerCase() === email.toLowerCase())
                    : false;
                  return (
                    <Stack key={i} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Checkbox
                        size="small"
                        checked={gohlSearchSelected.has(i)}
                        onChange={() => toggleGohlSearchSelected(i)}
                        disabled={alreadyExists}
                      />
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>
                        {displayName}
                        {email && ` · ${email}`}
                        {phone && ` · ${phone}`}
                      </Typography>
                      {alreadyExists && (
                        <Chip size="small" label="In CRM" color="success" variant="outlined" />
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
        <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {visibleOrderedColumns.map((id) => (
                  <TableCell
                    key={id}
                    align={id === 'actions' ? 'right' : 'left'}
                    onDragOver={handleColumnDragOver}
                    onDrop={(e) => handleColumnDrop(e, id)}
                    sx={{
                      userSelect: 'none',
                      opacity: draggedColumn === id ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      borderRight: id !== 'actions' ? '1px solid' : undefined,
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box
                        component="span"
                        draggable
                        onDragStart={(e) => handleColumnDragStart(e, id)}
                        onDragEnd={handleColumnDragEnd}
                        sx={{ cursor: 'grab', display: 'flex' }}
                      >
                        <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </Box>
                      {id === 'actions' || id === 'upcomingTask' || id === 'upcomingAppointment' ? (
                        COLUMN_LABELS[id]
                      ) : (
                        <Box
                          component="button"
                          type="button"
                          onClick={() => handleHeaderClick(id)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            font: 'inherit',
                            color: 'inherit',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {COLUMN_LABELS[id]}
                          <Stack direction="row" alignItems="center" sx={{ ml: 0.25 }}>
                            <ArrowUpwardIcon
                              sx={{
                                fontSize: 16,
                                opacity: sortBy === id && sortDirection === 'asc' ? 1 : 0.4,
                                color: sortBy === id && sortDirection === 'asc' ? 'primary.main' : 'text.secondary',
                              }}
                            />
                            <ArrowDownwardIcon
                              sx={{
                                fontSize: 16,
                                opacity: sortBy === id && sortDirection === 'desc' ? 1 : 0.4,
                                color: sortBy === id && sortDirection === 'desc' ? 'primary.main' : 'text.secondary',
                              }}
                            />
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedContacts.map((row) => (
                <TableRow key={row.id} hover>
                  {visibleOrderedColumns.map((id) => {
                    if (id === 'name') {
                      return (
                        <TableCell key={id}>
                          <Typography
                            component="button"
                            variant="body2"
                            onClick={() => setSelectedContactId(row.id)}
                            sx={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: 'primary.main',
                              textDecoration: 'underline',
                              textAlign: 'left',
                              font: 'inherit',
                              '&:hover': { color: 'primary.dark' },
                            }}
                          >
                            {row.name}
                          </Typography>
                        </TableCell>
                      );
                    }
                    if (id === 'email' || id === 'phone' || id === 'company') {
                      const val = (row as unknown as Record<string, unknown>)[id];
                      const display = val != null && String(val).trim() !== '' ? String(val) : '—';
                      return (
                        <TableCell key={id}>
                          <Box
                            onClick={(e) => openCellEdit(row, id, e)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 0.5,
                              width: '100%',
                              minHeight: 32,
                              cursor: 'pointer',
                              borderRadius: 0.5,
                              px: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                              '&:hover .cell-edit-icon': { opacity: 1 },
                            }}
                          >
                            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                              {display}
                            </Typography>
                            <EditIcon className="cell-edit-icon" sx={{ fontSize: 14, opacity: 0, color: 'primary.main' }} />
                          </Box>
                        </TableCell>
                      );
                    }
                    if (id === 'status') {
                      return (
                        <TableCell key={id}>
                          <Select
                            value={row.status}
                            onChange={(e) => handleStatusChange(row, e)}
                            size="small"
                            variant="outlined"
                            sx={{
                              minWidth: 100,
                              height: 32,
                              fontSize: '0.875rem',
                              '& .MuiSelect-select': { py: 0.5 },
                            }}
                          >
                            <MenuItem value="Lead">New Lead</MenuItem>
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                          </Select>
                        </TableCell>
                      );
                    }
                    if (id === 'stage') {
                      const stageValue = row.pipelineStages?.[row.pipeline ?? 'default'] ?? row.pipelineStage ?? 'Lead';
                      const stageOptions = getStageOptionsForPipeline(row.pipeline, pipelineOptions);
                      return (
                        <TableCell key={id}>
                          <Select
                            value={stageValue}
                            onChange={(e) => handleStageChange(row, e)}
                            size="small"
                            variant="outlined"
                            sx={{
                              minWidth: 110,
                              height: 32,
                              fontSize: '0.875rem',
                              '& .MuiSelect-select': { py: 0.5 },
                            }}
                          >
                            {stageOptions.map((s) => (
                              <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      );
                    }
                    if (id === 'pipeline') {
                      const pipelineValue = row.pipeline ?? '';
                      return (
                        <TableCell key={id}>
                          <Select
                            value={pipelineValue}
                            onChange={(e) => handlePipelineChange(row, e)}
                            onOpen={() => setPipelineOptions(loadPipelines(crmId))}
                            size="small"
                            variant="outlined"
                            displayEmpty
                            sx={{
                              minWidth: 120,
                              height: 32,
                              fontSize: '0.875rem',
                              '& .MuiSelect-select': { py: 0.5 },
                            }}
                          >
                            <MenuItem value="">—</MenuItem>
                            {pipelineOptions.map((p) => (
                              <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      );
                    }
                    if (id === 'tags') {
                      const display = (row.tags ?? []).length > 0 ? (row.tags ?? []).join(', ') : '—';
                      return (
                        <TableCell key={id}>
                          <Box
                            onClick={(e) => openCellEdit(row, id, e)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 0.5,
                              width: '100%',
                              minHeight: 32,
                              cursor: 'pointer',
                              borderRadius: 0.5,
                              px: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                              '&:hover .cell-edit-icon': { opacity: 1 },
                            }}
                          >
                            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                              {display}
                            </Typography>
                            <EditIcon className="cell-edit-icon" sx={{ fontSize: 14, opacity: 0, color: 'primary.main' }} />
                          </Box>
                        </TableCell>
                      );
                    }
                    if (id === 'fullAddress') {
                      const display = row.fullAddress != null && String(row.fullAddress).trim() !== '' ? row.fullAddress : '—';
                      return (
                        <TableCell key={id} sx={{ maxWidth: 280 }}>
                          <Box
                            onClick={(e) => openCellEdit(row, id, e)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 0.5,
                              width: '100%',
                              minHeight: 32,
                              cursor: 'pointer',
                              borderRadius: 0.5,
                              px: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                              '&:hover .cell-edit-icon': { opacity: 1 },
                            }}
                          >
                            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                              {display}
                            </Typography>
                            <EditIcon className="cell-edit-icon" sx={{ fontSize: 14, opacity: 0, color: 'primary.main' }} />
                          </Box>
                        </TableCell>
                      );
                    }
                    if (id === 'temperature') {
                      const tempValue = row.temperature ?? '';
                      return (
                        <TableCell key={id}>
                          <Select
                            value={tempValue}
                            onChange={(e) => handleTemperatureChange(row, e)}
                            size="small"
                            variant="outlined"
                            displayEmpty
                            sx={{
                              minWidth: 100,
                              height: 32,
                              fontSize: '0.875rem',
                              '& .MuiSelect-select': { py: 0.5 },
                            }}
                          >
                            <MenuItem value="">—</MenuItem>
                            {TEMPERATURE_OPTIONS.map((t) => (
                              <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      );
                    }
                    if (id === 'lastContact') {
                      const display = row.lastContact ? new Date(row.lastContact).toLocaleDateString() : '—';
                      return (
                        <TableCell key={id}>
                          <Box
                            onClick={(e) => openCellEdit(row, id, e)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 0.5,
                              width: '100%',
                              minHeight: 32,
                              cursor: 'pointer',
                              borderRadius: 0.5,
                              px: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                              '&:hover .cell-edit-icon': { opacity: 1 },
                            }}
                          >
                            <Typography variant="body2">{display}</Typography>
                            <EditIcon className="cell-edit-icon" sx={{ fontSize: 14, opacity: 0, color: 'primary.main' }} />
                          </Box>
                        </TableCell>
                      );
                    }
                    if (id === 'upcomingTask') {
                      return (
                        <TableCell key={id} sx={{ minWidth: 180 }} padding="none">
                          <Box
                            component="button"
                            type="button"
                            onClick={(e) => {
                              const nextTask = getUpcomingTask(row);
                              setEditingTask({
                                contact: row,
                                task: nextTask,
                                draft: nextTask ? { ...nextTask } : { id: `task-${Date.now()}`, title: '', dueDate: undefined, dueTime: undefined, completed: false },
                                anchorEl: e.currentTarget,
                              });
                            }}
                            sx={{
                              display: 'block',
                              width: '100%',
                              minHeight: 36,
                              px: 1,
                              py: 0.75,
                              textAlign: 'left',
                              border: '1px dashed',
                              borderColor: 'divider',
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              cursor: 'pointer',
                              font: 'inherit',
                              color: 'text.primary',
                              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.selected' },
                            }}
                          >
                            {(() => {
                              const nextTask = getUpcomingTask(row);
                              return nextTask ? (
                                <Typography variant="caption" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                                  {nextTask.title}
                                  {nextTask.dueDate ? ` · ${formatShortDate(nextTask.dueDate)}${nextTask.dueTime ? ` ${formatDueTime(nextTask.dueTime)}` : ''}` : nextTask.dueTime ? ` · ${formatDueTime(nextTask.dueTime)}` : ''}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.disabled">Add task...</Typography>
                              );
                            })()}
                          </Box>
                        </TableCell>
                      );
                    }
                    if (id === 'upcomingAppointment') {
                      return (
                        <TableCell key={id} sx={{ minWidth: 180 }} padding="none">
                          <Box
                            component="button"
                            type="button"
                            onClick={(e) => {
                              const nextAppt = getUpcomingAppointment(row);
                              setEditingAppointment({
                                contact: row,
                                appointment: nextAppt,
                                draft: nextAppt ? { ...nextAppt } : { id: `apt-${Date.now()}`, title: '', date: new Date().toISOString().slice(0, 10), time: undefined, notes: undefined },
                                anchorEl: e.currentTarget,
                              });
                            }}
                            sx={{
                              display: 'block',
                              width: '100%',
                              minHeight: 36,
                              px: 1,
                              py: 0.75,
                              textAlign: 'left',
                              border: '1px dashed',
                              borderColor: 'divider',
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              cursor: 'pointer',
                              font: 'inherit',
                              color: 'text.primary',
                              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.selected' },
                            }}
                          >
                            {(() => {
                              const nextAppt = getUpcomingAppointment(row);
                              return nextAppt ? (
                                <Typography variant="caption" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                                  {nextAppt.title} · {formatShortDate(nextAppt.date)}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.disabled">Add appointment...</Typography>
                              );
                            })()}
                          </Box>
                        </TableCell>
                      );
                    }
                    if (id === 'actions') {
                      return (
                        <TableCell key={id} align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton size="small" color="primary" aria-label="Edit" onClick={() => setEditContact(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" aria-label="Delete" onClick={() => setDeleteTarget(row)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      );
                    }
                    // All other columns: editable cell with hover
                    const value = (row as unknown as Record<string, unknown>)[id];
                    const display = value != null && String(value).trim() !== '' ? String(value) : '—';
                    return (
                      <TableCell key={id}>
                        <Box
                          onClick={(e) => openCellEdit(row, id, e)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 0.5,
                            width: '100%',
                            minHeight: 32,
                            cursor: 'pointer',
                            borderRadius: 0.5,
                            px: 0.5,
                            '&:hover': { bgcolor: 'action.hover' },
                            '&:hover .cell-edit-icon': { opacity: 1 },
                          }}
                        >
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {display}
                          </Typography>
                          <EditIcon className="cell-edit-icon" sx={{ fontSize: 14, opacity: 0, color: 'primary.main' }} />
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedContacts.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* Edit appointment popover */}
      <Popover
        open={Boolean(editingAppointment)}
        anchorEl={editingAppointment?.anchorEl}
        onClose={() => setEditingAppointment(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {editingAppointment && (
          <Box sx={{ p: 2, minWidth: 260 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EventIcon fontSize="small" /> {editingAppointment.appointment ? 'Edit' : 'Add'} appointment
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                size="small"
                label="Title"
                fullWidth
                value={editingAppointment.draft.title}
                onChange={(e) => setEditingAppointment((prev) => prev ? { ...prev, draft: { ...prev.draft, title: e.target.value } } : null)}
              />
              <TextField
                size="small"
                label="Date"
                type="date"
                fullWidth
                value={editingAppointment.draft.date}
                onChange={(e) => setEditingAppointment((prev) => prev ? { ...prev, draft: { ...prev.draft, date: e.target.value } } : null)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 'aria-label': 'Appointment date' }}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setEditingAppointment(null)}>Cancel</Button>
                <Button size="small" variant="contained" onClick={handleSaveAppointment}>Save</Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Popover>

      {/* Edit task popover */}
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
              <TaskIcon fontSize="small" /> {editingTask.task ? 'Edit' : 'Add'} task
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
                <Button size="small" variant="contained" onClick={handleSaveTask}>Save</Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Popover>

      {/* Edit cell popover (spreadsheet hover-edit) */}
      <Popover
        open={Boolean(editingCell)}
        anchorEl={editingCell?.anchorEl}
        onClose={() => setEditingCell(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {editingCell && (
          <Box sx={{ p: 2, minWidth: 240 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Edit {COLUMN_LABELS[editingCell.columnId]}
            </Typography>
            {editingCell.columnId === 'stage' ? (
              <Select
                size="small"
                fullWidth
                value={cellEditDraft}
                onChange={(e) => setCellEditDraft(e.target.value)}
                sx={{ mb: 1.5 }}
              >
                {getStageOptionsForPipeline(editingCell.contact.pipeline, pipelineOptions).map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                ))}
              </Select>
            ) : editingCell.columnId === 'temperature' ? (
              <Select
                size="small"
                fullWidth
                value={cellEditDraft}
                onChange={(e) => setCellEditDraft(e.target.value)}
                displayEmpty
                sx={{ mb: 1.5 }}
              >
                <MenuItem value="">—</MenuItem>
                {TEMPERATURE_OPTIONS.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            ) : editingCell.columnId === 'pipeline' ? (
              <Select
                size="small"
                fullWidth
                value={cellEditDraft}
                onChange={(e) => setCellEditDraft(e.target.value)}
                displayEmpty
                onOpen={() => setPipelineOptions(loadPipelines(crmId))}
                sx={{ mb: 1.5 }}
              >
                <MenuItem value="">—</MenuItem>
                {pipelineOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                ))}
              </Select>
            ) : (
              <TextField
                size="small"
                fullWidth
                type={isDateColumn(editingCell.columnId) ? 'date' : 'text'}
                value={cellEditDraft}
                onChange={(e) => setCellEditDraft(e.target.value)}
                InputLabelProps={isDateColumn(editingCell.columnId) ? { shrink: true } : undefined}
                sx={{ mb: 1.5 }}
              />
            )}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setEditingCell(null)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={saveCellEdit}>Save</Button>
            </Stack>
          </Box>
        )}
      </Popover>

      <AddContactDialog
        open={isAddDialogOpen || Boolean(editContact)}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditContact(null);
        }}
        onAdd={handleAddContact}
        editContact={editContact}
        onSave={handleSaveContact}
      />
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete contact?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget
              ? `Remove "${deleteTarget.name}" from contacts? This cannot be undone.`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && handleDeleteContact(deleteTarget)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={gohlPickerOpen} onClose={() => setGohlPickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select contacts to import</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Choose one or more leads from GoHighLevel. Only selected contacts will be added to your CRM.
          </DialogContentText>
          <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {gohlContacts.map((c, i) => {
              const name = (c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' ')) as string;
              const displayName = (name && String(name).trim()) || 'Unknown';
              const email = String(c.email ?? '').trim();
              const phone = String(c.phone ?? '').trim();
              return (
                <FormControlLabel
                  key={i}
                  control={
                    <Checkbox
                      checked={gohlSelected.has(i)}
                      onChange={() => toggleGohlSelected(i)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {displayName}
                      {email && ` · ${email}`}
                      {phone && ` · ${phone}`}
                    </Typography>
                  }
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGohlPickerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={importSelectedGohlContacts}
            disabled={gohlSelected.size === 0}
          >
            Import {gohlSelected.size === 0 ? 'selected' : gohlSelected.size === 1 ? '1 contact' : `${gohlSelected.size} contacts`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Contacts; 