import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  ViewModule as CardFieldsIcon,
  ViewList as ViewListIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  DragIndicator as DragIndicatorIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import type { Contact, PipelineStage } from './types';

const CARD_FIELDS_STORAGE_KEY_PREFIX = 'crmPipelineCardFields';
const PIPELINES_STORAGE_KEY_PREFIX = 'crmPipelines';
const CURRENT_PIPELINE_KEY_PREFIX = 'crmCurrentPipelineId';
const OPPORTUNITIES_COLUMNS_KEY_PREFIX = 'crmOpportunitiesColumns';
const SPREADSHEET_COLUMN_ORDER_KEY_PREFIX = 'crmPipelineSpreadsheetColumnOrder';
const SPREADSHEET_VISIBLE_COLUMNS_KEY_PREFIX = 'crmPipelineSpreadsheetVisibleColumns';

function getStorageKey(prefix: string, crmId: string) {
  return `${prefix}_${crmId}`;
}

const CARD_FIELD_OPTIONS: { key: keyof Contact | string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'leadOwner', label: 'Lead Owner' },
  { key: 'lastContact', label: 'Last Contact' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'Zip' },
  { key: 'county', label: 'County' },
  { key: 'salesPrice', label: 'Sales Price' },
  { key: 'salesDate', label: 'Sales Date' },
];

function loadCardFields(crmId: string): string[] {
  try {
    const key = getStorageKey(CARD_FIELDS_STORAGE_KEY_PREFIX, crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return ['name', 'company', 'phone', 'email', 'leadOwner'];
}

function saveCardFields(fields: string[], crmId: string) {
  try {
    localStorage.setItem(getStorageKey(CARD_FIELDS_STORAGE_KEY_PREFIX, crmId), JSON.stringify(fields));
  } catch {
    /* ignore */
  }
}

export interface StageDef {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_STAGES: StageDef[] = [
  { id: 'Lead', label: 'Lead', color: '#9e9e9e' },
  { id: 'Qualified', label: 'Qualified', color: '#4CAF50' },
  { id: 'Proposal', label: 'Proposal', color: '#2196F3' },
  { id: 'Negotiation', label: 'Negotiation', color: '#FF9800' },
  { id: 'Closing', label: 'Closing', color: '#9C27B0' },
  { id: 'Won', label: 'Won', color: '#2e7d32' },
  { id: 'Lost', label: 'Lost', color: '#c62828' },
];

export interface PipelineItem {
  id: string;
  title: string;
  stages?: StageDef[];
}

const DEFAULT_PIPELINES: PipelineItem[] = [
  { id: 'default', title: 'Sales', stages: [...DEFAULT_STAGES] },
  { id: 'acq', title: 'ACQ', stages: [...DEFAULT_STAGES] },
  { id: 'dispo', title: 'Dispo', stages: [...DEFAULT_STAGES] },
];

function ensurePipelineStages(pipelines: PipelineItem[]): PipelineItem[] {
  return pipelines.map((p) => ({
    ...p,
    stages: p.stages?.length ? p.stages : [...DEFAULT_STAGES],
  }));
}

export function loadPipelines(crmId: string): PipelineItem[] {
  try {
    const key = getStorageKey(PIPELINES_STORAGE_KEY_PREFIX, crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as PipelineItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingTitles = new Set(parsed.map((p) => p.title.toLowerCase()));
        const merged = [...parsed];
        for (const def of DEFAULT_PIPELINES) {
          if (!existingTitles.has(def.title.toLowerCase())) {
            merged.push(def);
            existingTitles.add(def.title.toLowerCase());
          }
        }
        const withStages = ensurePipelineStages(merged);
        if (withStages.some((p, i) => (p.stages?.length ?? 0) !== (merged[i]?.stages?.length ?? 0))) savePipelines(withStages, crmId);
        return withStages;
      }
    }
  } catch {
    /* ignore */
  }
  const initial = ensurePipelineStages([...DEFAULT_PIPELINES]);
  savePipelines(initial, crmId);
  return initial;
}

function savePipelines(list: PipelineItem[], crmId: string) {
  try {
    localStorage.setItem(getStorageKey(PIPELINES_STORAGE_KEY_PREFIX, crmId), JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function loadCurrentPipelineId(pipelines: PipelineItem[], crmId: string): string {
  try {
    const key = getStorageKey(CURRENT_PIPELINE_KEY_PREFIX, crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw && pipelines.some((p) => p.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return pipelines[0]?.id ?? 'default';
}

function saveCurrentPipelineId(id: string, crmId: string) {
  try {
    localStorage.setItem(getStorageKey(CURRENT_PIPELINE_KEY_PREFIX, crmId), id);
  } catch {
    /* ignore */
  }
}

function loadOpportunitiesColumns(crmId: string): string[] {
  try {
    const key = getStorageKey(OPPORTUNITIES_COLUMNS_KEY_PREFIX, crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return ['name', 'company', 'email', 'phone', 'leadOwner', 'status', 'lastContact', 'address', 'city', 'state', 'zip', 'salesPrice', 'salesDate'];
}

function saveOpportunitiesColumns(fields: string[], crmId: string) {
  try {
    localStorage.setItem(getStorageKey(OPPORTUNITIES_COLUMNS_KEY_PREFIX, crmId), JSON.stringify(fields));
  } catch {
    /* ignore */
  }
}

type SpreadsheetColumnId =
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'email'
  | 'status'
  | 'leadOwner'
  | 'ownsMultiple'
  | 'phone'
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
  | 'salesDate'
  | 'dataSource'
  | 'pipeline'
  | 'stage'
  | 'tags'
  | 'fullAddress'
  | 'temperature'
  | 'lastContact';

const DEFAULT_SPREADSHEET_COLUMN_ORDER: SpreadsheetColumnId[] = [
  'name', 'firstName', 'lastName', 'company', 'email', 'status', 'leadOwner', 'ownsMultiple',
  'phone', 'phone2', 'phone3', 'phone4', 'phone5', 'phone6', 'phone7', 'phone8', 'phone9', 'phone10',
  'mailingAddress', 'mailingCity', 'mailingState', 'mailingZip',
  'propertyType', 'lotSizeSqft', 'totalAssessedValue', 'subdivision',
  'address', 'city', 'state', 'zip', 'county',
  'latitude', 'longitude', 'apn', 'estimatedValue', 'topography', 'acres',
  'taxDelinquent', 'taxDelinquentYear', 'taxAmountDue', 'salesPrice', 'salesDate', 'dataSource',
  'pipeline', 'stage', 'tags', 'fullAddress', 'temperature', 'lastContact',
];

const SPREADSHEET_COLUMN_LABELS: Record<SpreadsheetColumnId, string> = {
  name: 'Name',
  firstName: 'First Name',
  lastName: 'Last Name',
  company: 'Company',
  email: 'Email',
  status: 'Status',
  leadOwner: 'Lead Owner',
  ownsMultiple: 'Owns Multiple',
  phone: 'Phone',
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
  salesDate: 'Sales Date',
  dataSource: 'Data Source',
  pipeline: 'Pipeline',
  stage: 'Stage',
  tags: 'Tags',
  fullAddress: 'Full Address',
  temperature: 'Temperature',
  lastContact: 'Last Contact',
};

const TEMPERATURE_OPTIONS = ['Hot', 'Warm', 'Cold'] as const;

function loadSpreadsheetColumnOrder(crmId: string): SpreadsheetColumnId[] {
  try {
    const key = getStorageKey(SPREADSHEET_COLUMN_ORDER_KEY_PREFIX, crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as SpreadsheetColumnId[];
      if (Array.isArray(parsed) && parsed.length === DEFAULT_SPREADSHEET_COLUMN_ORDER.length) return parsed;
      const valid = new Set(DEFAULT_SPREADSHEET_COLUMN_ORDER);
      const merged = parsed.filter((id) => valid.has(id));
      DEFAULT_SPREADSHEET_COLUMN_ORDER.forEach((id) => {
        if (!merged.includes(id)) merged.push(id);
      });
      return merged.length ? merged : [...DEFAULT_SPREADSHEET_COLUMN_ORDER];
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_SPREADSHEET_COLUMN_ORDER];
}

function saveSpreadsheetColumnOrder(order: SpreadsheetColumnId[], crmId: string) {
  try {
    localStorage.setItem(getStorageKey(SPREADSHEET_COLUMN_ORDER_KEY_PREFIX, crmId), JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

function loadSpreadsheetVisibleColumns(crmId: string): SpreadsheetColumnId[] {
  try {
    const key = getStorageKey(SPREADSHEET_VISIBLE_COLUMNS_KEY_PREFIX, crmId);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as SpreadsheetColumnId[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = new Set(DEFAULT_SPREADSHEET_COLUMN_ORDER);
        return parsed.filter((id) => valid.has(id));
      }
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_SPREADSHEET_COLUMN_ORDER];
}

function saveSpreadsheetVisibleColumns(ids: SpreadsheetColumnId[], crmId: string) {
  try {
    localStorage.setItem(getStorageKey(SPREADSHEET_VISIBLE_COLUMNS_KEY_PREFIX, crmId), JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

const SPREADSHEET_DATE_COLUMNS: SpreadsheetColumnId[] = ['lastContact', 'salesDate', 'taxDelinquentYear'];

function getSpreadsheetSortValue(contact: Contact, columnId: SpreadsheetColumnId, pipelineId: string, firstStageId: string = 'Lead'): string | number | null {
  if (columnId === 'stage') return getContactStageForPipeline(contact, pipelineId, firstStageId).toLowerCase();
  if (columnId === 'tags') return (contact.tags ?? []).join(', ').toLowerCase();
  if (SPREADSHEET_DATE_COLUMNS.includes(columnId)) {
    const v = (contact as unknown as Record<string, unknown>)[columnId];
    if (v == null || String(v).trim() === '') return null;
    const d = new Date(String(v)).getTime();
    return Number.isNaN(d) ? null : d;
  }
  const v = (contact as unknown as Record<string, unknown>)[columnId];
  if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
  if (Array.isArray(v)) return v.join(', ').toLowerCase();
  return String(v).toLowerCase();
}

function formatCardValue(contact: Contact, key: string): string {
  const v = (contact as unknown as Record<string, unknown>)[key];
  if (v == null || v === '') return '—';
  if (key === 'lastContact' || key === 'salesDate') {
    try {
      return new Date(String(v)).toLocaleDateString();
    } catch {
      return String(v);
    }
  }
  if (key === 'salesPrice') {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? String(v) : `$${n.toLocaleString()}`;
  }
  return String(v);
}

export interface PipelineManagementProps {
  contacts: Contact[];
  onUpdateContact: (contact: Contact) => void;
  onOpenContact?: (contactId: number) => void;
  crmId?: string;
  /** List of CRMs (e.g. ACQ, Dispo) for "Add to another CRM" in Opportunities */
  crms?: { id: string; name: string }[];
  /** Callback to add the current contact to another CRM's contact list */
  onAddContactToOtherCrm?: (contact: Contact, targetCrmId: string) => void;
}

const OPPORTUNITIES_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  CARD_FIELD_OPTIONS.map((o) => [o.key, o.label])
);

function getContactStageForPipeline(contact: Contact, pipelineId: string, firstStageId: string = 'Lead'): string {
  return contact.pipelineStages?.[pipelineId] ?? contact.pipelineStage ?? firstStageId;
}

function PipelineManagement({ contacts, onUpdateContact, onOpenContact, crmId: crmIdProp = 'acq', crms = [], onAddContactToOtherCrm }: PipelineManagementProps) {
  const crmId = crmIdProp ?? 'acq';
  const [pipelines, setPipelines] = useState<PipelineItem[]>(() => loadPipelines(crmId));
  const [currentPipelineId, setCurrentPipelineIdState] = useState<string>(() => loadCurrentPipelineId(loadPipelines(crmId), crmId));
  const [cardFields, setCardFields] = useState<string[]>(() => loadCardFields(crmId));
  const [draggedContactId, setDraggedContactId] = useState<number | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);
  const [opportunitiesContact, setOpportunitiesContact] = useState<Contact | null>(null);
  const [opportunitiesColumns, setOpportunitiesColumns] = useState<string[]>(() => loadOpportunitiesColumns(crmId));
  const [opportunitiesColumnsAnchor, setOpportunitiesColumnsAnchor] = useState<HTMLElement | null>(null);
  const [cardFieldsInDialogAnchor, setCardFieldsInDialogAnchor] = useState<HTMLElement | null>(null);
  const [addPipelineOpen, setAddPipelineOpen] = useState(false);
  const [newPipelineTitle, setNewPipelineTitle] = useState('');
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageColor, setNewStageColor] = useState('#757575');
  const [renamePipelineOpen, setRenamePipelineOpen] = useState(false);
  const [renamePipelineTitle, setRenamePipelineTitle] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'spreadsheet'>('board');
  const [spreadsheetColumnOrder, setSpreadsheetColumnOrder] = useState<SpreadsheetColumnId[]>(() => loadSpreadsheetColumnOrder(crmId));
  const [spreadsheetSortBy, setSpreadsheetSortBy] = useState<SpreadsheetColumnId | null>(null);
  const [spreadsheetSortDirection, setSpreadsheetSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draggedSpreadsheetColumn, setDraggedSpreadsheetColumn] = useState<SpreadsheetColumnId | null>(null);
  const [spreadsheetVisibleColumnIds, setSpreadsheetVisibleColumnIds] = useState<SpreadsheetColumnId[]>(() => loadSpreadsheetVisibleColumns(crmId));
  const [spreadsheetColumnsPopoverAnchor, setSpreadsheetColumnsPopoverAnchor] = useState<HTMLElement | null>(null);
  const [editingSpreadsheetCell, setEditingSpreadsheetCell] = useState<{ contact: Contact; columnId: SpreadsheetColumnId; anchorEl: HTMLElement } | null>(null);
  const [spreadsheetCellEditDraft, setSpreadsheetCellEditDraft] = useState('');
  const didJustDragRef = useRef(false);

  React.useEffect(() => {
    setPipelines(loadPipelines(crmId));
    const pl = loadPipelines(crmId);
    setCurrentPipelineIdState(loadCurrentPipelineId(pl, crmId));
    setCardFields(loadCardFields(crmId));
    setOpportunitiesColumns(loadOpportunitiesColumns(crmId));
    setSpreadsheetColumnOrder(loadSpreadsheetColumnOrder(crmId));
    setSpreadsheetVisibleColumnIds(loadSpreadsheetVisibleColumns(crmId));
  }, [crmId]);

  const currentPipeline = pipelines.find((p) => p.id === currentPipelineId) ?? pipelines[0];
  const currentStages: StageDef[] = currentPipeline?.stages?.length ? currentPipeline.stages! : DEFAULT_STAGES;
  const defaultStageId = currentStages[0]?.id ?? 'Lead';

  /** Contacts that belong to the current pipeline only (one pipeline per contact). */
  const contactsInCurrentPipeline = React.useMemo(
    () => contacts.filter((c) => c.pipeline === currentPipelineId),
    [contacts, currentPipelineId]
  );

  const setCurrentPipelineId = useCallback((id: string) => {
    setCurrentPipelineIdState(id);
    saveCurrentPipelineId(id, crmId);
  }, [crmId]);

  const contactsByStage = useCallback(
    (stageId: string) =>
      contactsInCurrentPipeline.filter((c) => getContactStageForPipeline(c, currentPipelineId, defaultStageId) === stageId),
    [contactsInCurrentPipeline, currentPipelineId, defaultStageId]
  );

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    setDraggedContactId(contact.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ contactId: contact.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedContactId(null);
    setDropTargetStage(null);
    didJustDragRef.current = true;
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStage(stageId);
  };

  const handleDragLeave = () => {
    setDropTargetStage(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDropTargetStage(null);
    setDraggedContactId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}') as { contactId?: number };
      const contactId = data.contactId;
      if (contactId == null) return;
      const contact = contacts.find((c) => c.id === contactId);
      if (contact) {
        onUpdateContact({
          ...contact,
          pipeline: currentPipelineId,
          pipelineStages: { [currentPipelineId]: stageId },
          pipelineStage: stageId,
        });
      }
    } catch {
      /* ignore */
    }
  };

  const handleAddPipeline = () => {
    const title = newPipelineTitle.trim();
    if (!title) return;
    const id = `pipeline-${Date.now()}`;
    const next = [...pipelines, { id, title, stages: [...DEFAULT_STAGES] }];
    setPipelines(next);
    savePipelines(next, crmId);
    setCurrentPipelineId(id);
    setNewPipelineTitle('');
    setAddPipelineOpen(false);
  };

  const handleAddStage = () => {
    const label = newStageTitle.trim();
    if (!label || !currentPipeline) return;
    const id = `stage-${Date.now()}`;
    const newStage: StageDef = { id, label, color: newStageColor };
    const updatedStages = [...currentStages, newStage];
    const next = pipelines.map((p) =>
      p.id === currentPipelineId ? { ...p, stages: updatedStages } : p
    );
    setPipelines(next);
    savePipelines(next, crmId);
    setNewStageTitle('');
    setNewStageColor('#757575');
    setAddStageOpen(false);
  };

  const handleRenamePipeline = () => {
    const title = renamePipelineTitle.trim();
    if (!title || !currentPipeline) return;
    const next = pipelines.map((p) => (p.id === currentPipelineId ? { ...p, title } : p));
    setPipelines(next);
    savePipelines(next, crmId);
    setRenamePipelineTitle('');
    setRenamePipelineOpen(false);
  };

  const handleCardFieldsChange = (key: string, checked: boolean) => {
    const next = checked ? [...cardFields, key] : cardFields.filter((f) => f !== key);
    if (next.length === 0) return;
    setCardFields(next);
    saveCardFields(next, crmId);
  };

  const handleOpportunitiesColumnsChange = (key: string, checked: boolean) => {
    const next = checked ? [...opportunitiesColumns, key] : opportunitiesColumns.filter((f) => f !== key);
    if (next.length === 0) return;
    setOpportunitiesColumns(next);
    saveOpportunitiesColumns(next, crmId);
  };

  const handleCardClick = (contact: Contact) => {
    if (didJustDragRef.current) {
      didJustDragRef.current = false;
      return;
    }
    setOpportunitiesContact(contact);
  };

  const handleSpreadsheetStageChange = (contact: Contact, stageId: string) => {
    onUpdateContact({
      ...contact,
      pipeline: currentPipelineId,
      pipelineStages: { [currentPipelineId]: stageId },
      pipelineStage: stageId,
    });
  };

  const openSpreadsheetCellEdit = (contact: Contact, columnId: SpreadsheetColumnId, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    let draft: string;
    if (columnId === 'tags') draft = (contact.tags ?? []).join(', ');
    else if (SPREADSHEET_DATE_COLUMNS.includes(columnId)) {
      const v = (contact as unknown as Record<string, unknown>)[columnId];
      draft = v != null && String(v).trim() !== '' ? String(v) : '';
      if (draft) {
        try {
          draft = new Date(draft).toISOString().slice(0, 10);
        } catch {
          /* keep */
        }
      }
    } else {
      const v = (contact as unknown as Record<string, unknown>)[columnId];
      if (v == null) draft = '';
      else if (Array.isArray(v)) draft = v.join(', ');
      else draft = String(v);
    }
    setSpreadsheetCellEditDraft(draft);
    setEditingSpreadsheetCell({ contact, columnId, anchorEl: e.currentTarget });
  };

  const saveSpreadsheetCellEdit = () => {
    if (!editingSpreadsheetCell) return;
    const { contact, columnId } = editingSpreadsheetCell;
    if (columnId === 'tags') {
      const tags = spreadsheetCellEditDraft.split(',').map((s) => s.trim()).filter(Boolean);
      onUpdateContact({ ...contact, tags });
    } else if (SPREADSHEET_DATE_COLUMNS.includes(columnId)) {
      onUpdateContact({ ...contact, [columnId]: spreadsheetCellEditDraft.trim() || undefined });
    } else {
      onUpdateContact({ ...contact, [columnId]: spreadsheetCellEditDraft });
    }
    setEditingSpreadsheetCell(null);
  };

  const isSpreadsheetDateColumn = (id: SpreadsheetColumnId) => SPREADSHEET_DATE_COLUMNS.includes(id);

  React.useEffect(() => {
    saveSpreadsheetColumnOrder(spreadsheetColumnOrder, crmId);
  }, [spreadsheetColumnOrder, crmId]);

  React.useEffect(() => {
    saveSpreadsheetVisibleColumns(spreadsheetVisibleColumnIds, crmId);
  }, [spreadsheetVisibleColumnIds, crmId]);

  const visibleOrderedSpreadsheetColumns = React.useMemo(
    () => spreadsheetColumnOrder.filter((id) => spreadsheetVisibleColumnIds.includes(id)),
    [spreadsheetColumnOrder, spreadsheetVisibleColumnIds]
  );

  const toggleSpreadsheetColumnVisible = (id: SpreadsheetColumnId) => {
    setSpreadsheetVisibleColumnIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== id);
      }
      return [...prev, id].sort((a, b) => spreadsheetColumnOrder.indexOf(a) - spreadsheetColumnOrder.indexOf(b));
    });
  };

  const handleSpreadsheetColumnDragStart = (e: React.DragEvent, id: SpreadsheetColumnId) => {
    setDraggedSpreadsheetColumn(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleSpreadsheetColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSpreadsheetColumnDrop = (e: React.DragEvent, targetId: SpreadsheetColumnId) => {
    e.preventDefault();
    if (!draggedSpreadsheetColumn || draggedSpreadsheetColumn === targetId) return;
    setSpreadsheetColumnOrder((prev) => {
      const from = prev.indexOf(draggedSpreadsheetColumn);
      const to = prev.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedSpreadsheetColumn);
      return next;
    });
  };

  const handleSpreadsheetColumnDragEnd = () => setDraggedSpreadsheetColumn(null);

  const handleSpreadsheetHeaderClick = (id: SpreadsheetColumnId) => {
    if (spreadsheetSortBy === id) setSpreadsheetSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSpreadsheetSortBy(id);
      setSpreadsheetSortDirection('asc');
    }
  };

  const sortedSpreadsheetContacts = React.useMemo(() => {
    if (!spreadsheetSortBy) return contactsInCurrentPipeline;
    const dir = spreadsheetSortDirection === 'asc' ? 1 : -1;
    return [...contactsInCurrentPipeline].sort((a, b) => {
      const va = getSpreadsheetSortValue(a, spreadsheetSortBy, currentPipelineId, defaultStageId);
      const vb = getSpreadsheetSortValue(b, spreadsheetSortBy, currentPipelineId, defaultStageId);
      if (va == null && vb == null) return 0;
      if (va == null) return 1 * dir;
      if (vb == null) return -1 * dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
    });
  }, [contactsInCurrentPipeline, spreadsheetSortBy, spreadsheetSortDirection, currentPipelineId, defaultStageId]);

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} color="text.primary" gutterBottom>
            Pipeline Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {viewMode === 'board' ? 'Contacts by stage. Drag cards between columns to update stage.' : 'Spreadsheet view of leads for the current pipeline.'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="pipeline-select-label">Pipeline</InputLabel>
              <Select
                labelId="pipeline-select-label"
                value={currentPipelineId}
                label="Pipeline"
                onChange={(e) => setCurrentPipelineId(e.target.value)}
              >
                {pipelines.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddPipelineOpen(true)}>
              Add pipeline
            </Button>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddStageOpen(true)}>
              Add stage
            </Button>
            <Tooltip title="Rename this pipeline">
              <IconButton size="small" onClick={() => { setRenamePipelineTitle(currentPipeline?.title ?? ''); setRenamePipelineOpen(true); }} aria-label="Rename pipeline">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          {viewMode === 'spreadsheet' && (
            <>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<ViewColumnIcon />}
                onClick={(e) => setSpreadsheetColumnsPopoverAnchor(e.currentTarget)}
              >
                Choose columns
              </Button>
              <Popover
                open={Boolean(spreadsheetColumnsPopoverAnchor)}
                anchorEl={spreadsheetColumnsPopoverAnchor}
                onClose={() => setSpreadsheetColumnsPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ p: 2, minWidth: 220, maxHeight: 420 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">Show columns</Typography>
                    <Button
                      size="small"
                      onClick={() => setSpreadsheetVisibleColumnIds([...DEFAULT_SPREADSHEET_COLUMN_ORDER])}
                    >
                      Select all
                    </Button>
                  </Box>
                  <FormGroup sx={{ maxHeight: 340, overflowY: 'auto' }}>
                    {DEFAULT_SPREADSHEET_COLUMN_ORDER.map((id) => (
                      <FormControlLabel
                        key={id}
                        control={
                          <Checkbox
                            checked={spreadsheetVisibleColumnIds.includes(id)}
                            onChange={() => toggleSpreadsheetColumnVisible(id)}
                            size="small"
                          />
                        }
                        label={SPREADSHEET_COLUMN_LABELS[id]}
                      />
                    ))}
                  </FormGroup>
                </Box>
              </Popover>
            </>
          )}
          <Button
            variant={viewMode === 'spreadsheet' ? 'contained' : 'outlined'}
            size="medium"
            startIcon={viewMode === 'board' ? <ViewListIcon /> : <CardFieldsIcon />}
            onClick={() => setViewMode((v) => (v === 'board' ? 'spreadsheet' : 'board'))}
          >
            {viewMode === 'board' ? 'Spreadsheet view' : 'Board view'}
          </Button>
        </Stack>
      </Box>

      <Dialog
        open={Boolean(opportunitiesContact)}
        onClose={() => setOpportunitiesContact(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <span>Opportunities Section</span>
          <IconButton size="small" onClick={() => setOpportunitiesContact(null)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {opportunitiesContact && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {opportunitiesContact.name}
              </Typography>
              {crms.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Also in CRM
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                    {(opportunitiesContact.alsoInCrmIds ?? []).map((id) => {
                      const crm = crms.find((c) => c.id === id);
                      return crm ? (
                        <Chip key={id} size="small" label={crm.name} color="primary" variant="outlined" />
                      ) : null;
                    })}
                    {((opportunitiesContact.alsoInCrmIds ?? []).length === 0) && (
                      <Typography variant="body2" color="text.secondary">This contact is only in this CRM.</Typography>
                    )}
                  </Stack>
                  {onAddContactToOtherCrm && crms.filter((c) => c.id !== crmId && !(opportunitiesContact.alsoInCrmIds ?? []).includes(c.id)).length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>Add to:</Typography>
                      {crms
                        .filter((c) => c.id !== crmId && !(opportunitiesContact.alsoInCrmIds ?? []).includes(c.id))
                        .map((c) => (
                          <Button
                            key={c.id}
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              onAddContactToOtherCrm(opportunitiesContact, c.id);
                              setOpportunitiesContact((prev) => prev ? { ...prev, alsoInCrmIds: [...(prev.alsoInCrmIds ?? []), c.id] } : null);
                            }}
                          >
                            {c.name}
                          </Button>
                        ))}
                    </Stack>
                  )}
                </Box>
              )}
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CardFieldsIcon />}
                  onClick={(e) => setOpportunitiesColumnsAnchor(e.currentTarget)}
                >
                  Choose columns to display
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CardFieldsIcon />}
                  onClick={(e) => setCardFieldsInDialogAnchor(e.currentTarget)}
                >
                  Fields to Display on Contact Card
                </Button>
                <Popover
                  open={Boolean(opportunitiesColumnsAnchor)}
                  anchorEl={opportunitiesColumnsAnchor}
                  onClose={() => setOpportunitiesColumnsAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                  <Box sx={{ p: 2, minWidth: 220 }}>
                    <Typography variant="subtitle2" gutterBottom>Show in Opportunities</Typography>
                    <FormGroup>
                      {CARD_FIELD_OPTIONS.map(({ key, label }) => (
                        <FormControlLabel
                          key={key}
                          control={
                            <Checkbox
                              checked={opportunitiesColumns.includes(key)}
                              onChange={(_, checked) => handleOpportunitiesColumnsChange(key, checked)}
                              size="small"
                            />
                          }
                          label={label}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                </Popover>
                <Popover
                  open={Boolean(cardFieldsInDialogAnchor)}
                  anchorEl={cardFieldsInDialogAnchor}
                  onClose={() => setCardFieldsInDialogAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                  <Box sx={{ p: 2, minWidth: 220 }}>
                    <Typography variant="subtitle2" gutterBottom>Show on contact cards</Typography>
                    <FormGroup>
                      {CARD_FIELD_OPTIONS.map(({ key, label }) => (
                        <FormControlLabel
                          key={key}
                          control={
                            <Checkbox
                              checked={cardFields.includes(key)}
                              onChange={(_, checked) => handleCardFieldsChange(key, checked)}
                              size="small"
                            />
                          }
                          label={label}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                </Popover>
              </Box>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {opportunitiesColumns.map((key) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        {OPPORTUNITIES_FIELD_LABELS[key] ?? key}
                      </Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ textAlign: 'right' }}>
                        {formatCardValue(opportunitiesContact, key)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addPipelineOpen} onClose={() => setAddPipelineOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add pipeline</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Pipeline name"
            value={newPipelineTitle}
            onChange={(e) => setNewPipelineTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPipeline()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={() => setAddPipelineOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPipeline} disabled={!newPipelineTitle.trim()}>
            Add
          </Button>
        </Box>
      </Dialog>

      <Dialog open={addStageOpen} onClose={() => setAddStageOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add stage</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Stage name"
            value={newStageTitle}
            onChange={(e) => setNewStageTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            sx={{ mt: 1 }}
          />
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Color</Typography>
            <input
              type="color"
              value={newStageColor}
              onChange={(e) => setNewStageColor(e.target.value)}
              style={{ width: 40, height: 32, padding: 2, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4 }}
            />
          </Box>
        </DialogContent>
        <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={() => setAddStageOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddStage} disabled={!newStageTitle.trim()}>
            Add
          </Button>
        </Box>
      </Dialog>

      <Dialog open={renamePipelineOpen} onClose={() => setRenamePipelineOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename pipeline</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Pipeline name"
            value={renamePipelineTitle}
            onChange={(e) => setRenamePipelineTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenamePipeline()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={() => setRenamePipelineOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRenamePipeline} disabled={!renamePipelineTitle.trim()}>
            Save
          </Button>
        </Box>
      </Dialog>

      {viewMode === 'spreadsheet' ? (
        <>
        <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {visibleOrderedSpreadsheetColumns.map((id) => (
                  <TableCell
                    key={id}
                    onDragOver={handleSpreadsheetColumnDragOver}
                    onDrop={(e) => handleSpreadsheetColumnDrop(e, id)}
                    sx={{
                      userSelect: 'none',
                      opacity: draggedSpreadsheetColumn === id ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box
                        component="span"
                        draggable
                        onDragStart={(e) => handleSpreadsheetColumnDragStart(e, id)}
                        onDragEnd={handleSpreadsheetColumnDragEnd}
                        sx={{ cursor: 'grab', display: 'flex' }}
                      >
                        <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </Box>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => handleSpreadsheetHeaderClick(id)}
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
                          fontWeight: 600,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {SPREADSHEET_COLUMN_LABELS[id]}
                        <Stack direction="row" alignItems="center" sx={{ ml: 0.25 }}>
                          <ArrowUpwardIcon
                            sx={{
                              fontSize: 16,
                              opacity: spreadsheetSortBy === id && spreadsheetSortDirection === 'asc' ? 1 : 0.4,
                              color: spreadsheetSortBy === id && spreadsheetSortDirection === 'asc' ? 'primary.main' : 'text.secondary',
                            }}
                          />
                          <ArrowDownwardIcon
                            sx={{
                              fontSize: 16,
                              opacity: spreadsheetSortBy === id && spreadsheetSortDirection === 'desc' ? 1 : 0.4,
                              color: spreadsheetSortBy === id && spreadsheetSortDirection === 'desc' ? 'primary.main' : 'text.secondary',
                            }}
                          />
                        </Stack>
                      </Box>
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSpreadsheetContacts.map((contact) => {
                const stage = getContactStageForPipeline(contact, currentPipelineId, defaultStageId);
                const renderCell = (colId: SpreadsheetColumnId) => {
                  if (colId === 'name') {
                    return (
                      <Typography
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => onOpenContact?.(contact.id)}
                        sx={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          font: 'inherit',
                          cursor: onOpenContact ? 'pointer' : 'default',
                          color: onOpenContact ? 'primary.main' : 'inherit',
                          textAlign: 'left',
                          textDecoration: onOpenContact ? 'underline' : 'none',
                          '&:hover': onOpenContact ? { color: 'primary.dark' } : undefined,
                        }}
                      >
                        {contact.name}
                      </Typography>
                    );
                  }
                  if (colId === 'stage') {
                    return (
                      <Select
                        size="small"
                        value={stage}
                        onChange={(e) => handleSpreadsheetStageChange(contact, e.target.value as PipelineStage)}
                        variant="outlined"
                        sx={{ minWidth: 120, height: 28, fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.25 } }}
                      >
                        {currentStages.map((s) => (
                          <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                        ))}
                      </Select>
                    );
                  }
                  if (colId === 'temperature') {
                    const tempValue = contact.temperature ?? '';
                    return (
                      <Select
                        size="small"
                        value={tempValue}
                        onChange={(e) => onUpdateContact({ ...contact, temperature: e.target.value === '' ? undefined : e.target.value })}
                        variant="outlined"
                        displayEmpty
                        sx={{ minWidth: 90, height: 28, fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.25 } }}
                      >
                        <MenuItem value="">—</MenuItem>
                        {TEMPERATURE_OPTIONS.map((t) => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    );
                  }
                  if (colId === 'pipeline') {
                    return (
                      <Select
                        size="small"
                        value={contact.pipeline ?? ''}
                        displayEmpty
                        onChange={(e) => {
                          const newPipelineId = e.target.value === '' ? undefined : e.target.value;
                          if (newPipelineId == null) {
                            onUpdateContact({ ...contact, pipeline: undefined, pipelineStages: undefined, pipelineStage: undefined });
                            return;
                          }
                          const targetPipeline = pipelines.find((p) => p.id === newPipelineId);
                          const targetStages = targetPipeline?.stages?.length ? targetPipeline.stages! : DEFAULT_STAGES;
                          const firstStageId = targetStages[0]?.id ?? 'Lead';
                          onUpdateContact({
                            ...contact,
                            pipeline: newPipelineId,
                            pipelineStages: { [newPipelineId]: firstStageId },
                            pipelineStage: firstStageId,
                          });
                        }}
                        variant="outlined"
                        sx={{ minWidth: 120, height: 28, fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.25 } }}
                      >
                        <MenuItem value="">—</MenuItem>
                        {pipelines.map((p) => (
                          <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                        ))}
                      </Select>
                    );
                  }
                  if (colId === 'tags') {
                    const display = (contact.tags ?? []).length > 0 ? (contact.tags ?? []).join(', ') : '—';
                    return (
                      <Box
                        onClick={(e) => openSpreadsheetCellEdit(contact, colId, e)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 0.5,
                          width: '100%',
                          minHeight: 28,
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
                    );
                  }
                  if (SPREADSHEET_DATE_COLUMNS.includes(colId)) {
                    const v = (contact as unknown as Record<string, unknown>)[colId];
                    const display = v == null || String(v).trim() === '' ? '—' : (() => {
                      try {
                        return new Date(String(v)).toLocaleDateString();
                      } catch {
                        return String(v);
                      }
                    })();
                    return (
                      <Box
                        onClick={(e) => openSpreadsheetCellEdit(contact, colId, e)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 0.5,
                          width: '100%',
                          minHeight: 28,
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
                    );
                  }
                  const v = (contact as unknown as Record<string, unknown>)[colId];
                  const display = v == null || (typeof v === 'string' && v.trim() === '') ? '—' : (Array.isArray(v) ? v.join(', ') : String(v));
                  return (
                    <Box
                      onClick={(e) => openSpreadsheetCellEdit(contact, colId, e)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 0.5,
                        width: '100%',
                        minHeight: 28,
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
                  );
                };
                return (
                  <TableRow key={contact.id} hover>
                    {visibleOrderedSpreadsheetColumns.map((id) => (
                      <TableCell key={id}>
                        {renderCell(id)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Popover
          open={Boolean(editingSpreadsheetCell)}
          anchorEl={editingSpreadsheetCell?.anchorEl ?? null}
          onClose={() => setEditingSpreadsheetCell(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Edit {editingSpreadsheetCell ? SPREADSHEET_COLUMN_LABELS[editingSpreadsheetCell.columnId] : ''}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={spreadsheetCellEditDraft}
              onChange={(e) => setSpreadsheetCellEditDraft(e.target.value)}
              type={editingSpreadsheetCell && isSpreadsheetDateColumn(editingSpreadsheetCell.columnId) ? 'date' : 'text'}
              sx={{ mb: 1.5 }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setEditingSpreadsheetCell(null)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={saveSpreadsheetCellEdit}>Save</Button>
            </Stack>
          </Box>
        </Popover>
        </>
      ) : (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          minHeight: 420,
          alignItems: 'stretch',
        }}
      >
        {currentStages.map(({ id, label, color }) => {
          const stageContacts = contactsByStage(id);
          const isDropTarget = dropTargetStage === id;
          return (
            <Paper
              key={id}
              elevation={1}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, id)}
              sx={{
                minWidth: 280,
                maxWidth: 280,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderTop: 3,
                borderColor: color,
                bgcolor: isDropTarget ? 'action.selected' : undefined,
                transition: 'background-color 0.15s',
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: 'grey.50',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stageContacts.length} contact{stageContacts.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Tooltip title="Add contact to stage">
                  <IconButton size="small" aria-label={`Add to ${label}`}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {stageContacts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No contacts
                  </Typography>
                ) : (
                  stageContacts.map((contact) => (
                    <Card
                      key={contact.id}
                      variant="outlined"
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(contact)}
                      sx={{
                        cursor: 'grab',
                        opacity: draggedContactId === contact.id ? 0.6 : 1,
                        flexShrink: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:active': { cursor: 'grabbing' },
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
                          <Typography
                            component="button"
                            type="button"
                            variant="subtitle2"
                            fontWeight={600}
                            noWrap
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenContact?.(contact.id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            sx={{
                              flex: 1,
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              font: 'inherit',
                              textAlign: 'left',
                              cursor: onOpenContact ? 'pointer' : 'default',
                              color: 'inherit',
                              '&:hover': onOpenContact ? { textDecoration: 'underline', color: 'primary.main' } : undefined,
                            }}
                          >
                            {contact.name}
                          </Typography>
                          <IconButton size="small" sx={{ p: 0.25 }} aria-label="More options" onClick={(e) => e.stopPropagation()}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        {cardFields.filter((k) => k !== 'name').map((key) => (
                          <Typography key={key} variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                            {formatCardValue(contact, key)}
                          </Typography>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
      )}
    </Box>
  );
}

const PipelineManagementExport: React.FC<PipelineManagementProps> = (props) => <PipelineManagement {...props} />;
export default PipelineManagementExport;
export type { PipelineStage };
