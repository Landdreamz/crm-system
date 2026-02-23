import React, { useState, useEffect } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShowChart as SalesIcon,
  People as ContactsIcon,
  AccountTree as PipelineIcon,
  CalendarToday as CalendarIcon,
  Settings as SettingsIcon,
  Task as TaskIcon,
  Notifications as NotificationsIcon,
  Calculate as CalculateIcon,
  Landscape as LandIcon,
  School as TrainingIcon,
  Campaign as MarketingIcon,
  AutoFixHigh as AutomationIcon,
  SmartToy as AIIcon,
  Phone as PhoneIcon,
  Assessment as AssessmentIcon,
  Logout as LogoutIcon,
  Assignment as DealDeskIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import SalesPerformance from './components/SalesPerformance';
import DealDesk from './components/DealDesk';
import Contacts, { loadContacts, saveContacts } from './components/Contacts';
import Announcements from './components/Announcements';
import AmortizationCalculator from './components/AmortizationCalculator';
import { LandCalculator } from './components/LandCalculator';
import TrainingResources from './components/TrainingResources';
import MarketingChannel from './components/MarketingChannel';
import AutomationWorkflows from './components/AutomationWorkflows';
import AskAI from './components/AskAI';
import PowerDialer from './components/PowerDialer';
import MarketResearch from './components/MarketResearch';
import PipelineManagement from './components/PipelineManagement';
import Settings from './components/Settings';
import type { Contact } from './components/types';

type Section = 'Sales Performance' | 'Deal Desk' | 'Market Research' | 'Contacts' | 'Pipeline Management' | 'Calendar' | 'Tasks' | 'Settings' | 'Announcements' | 'Amortization Calculator' | 'Land Evaluation Calculator' | 'Training & Resources' | 'Marketing Channel' | 'Automation & Workflows' | 'Ask A.I' | 'Power Dialer';

const CRM_ACTIVE_ID_KEY = 'crmActiveId';

export type CrmId = 'acq' | 'dispo';

const CRMS: { id: CrmId; name: string }[] = [
  { id: 'acq', name: 'ACQ CRM' },
  { id: 'dispo', name: 'Dispo CRM' },
];

function loadActiveCrmId(): CrmId {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CRM_ACTIVE_ID_KEY) : null;
    if (raw === 'acq' || raw === 'dispo') return raw;
  } catch {
    /* ignore */
  }
  return 'acq';
}

function saveActiveCrmId(id: CrmId) {
  try {
    localStorage.setItem(CRM_ACTIVE_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  minHeight: '100vh',
  background: theme.palette.background.default,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

interface DashboardLayoutProps {
  onLogout?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onLogout }) => {
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const [selectedSection, setSelectedSection] = React.useState<Section>('Market Research');
  const [currentCrmId, setCurrentCrmId] = useState<CrmId>(loadActiveCrmId);
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts(loadActiveCrmId()));
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  useEffect(() => {
    saveContacts(contacts, currentCrmId);
  }, [contacts, currentCrmId]);

  const handleSwitchCrm = (crmId: CrmId) => {
    if (crmId === currentCrmId) return;
    setCurrentCrmId(crmId);
    setContacts(loadContacts(crmId));
    setSelectedContactId(null);
    saveActiveCrmId(crmId);
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  };

  const handleOpenContact = (contactId: number) => {
    setSelectedContactId(contactId);
    setSelectedSection('Contacts');
  };

  const addContactToOtherCrm = (contact: Contact, targetCrmId: string) => {
    if (contact.alsoInCrmIds?.includes(targetCrmId)) return;
    const otherContacts = loadContacts(targetCrmId as CrmId);
    const newId = otherContacts.length === 0 ? 1 : Math.max(...otherContacts.map((c) => c.id)) + 1;
    const copy: Contact = {
      ...contact,
      id: newId,
      alsoInCrmIds: [...(contact.alsoInCrmIds ?? []).filter((id) => id !== targetCrmId), currentCrmId],
    };
    saveContacts([...otherContacts, copy], targetCrmId as CrmId);
    handleUpdateContact({ ...contact, alsoInCrmIds: [...(contact.alsoInCrmIds ?? []), targetCrmId] });
  };

  // Sidebar menu items: Land Evaluation → Amortization → Contacts → Pipeline → Calendar, then the rest
  const menuItems: { text: Section; icon: React.ReactNode }[] = [
    { text: 'Land Evaluation Calculator', icon: <LandIcon /> },
    { text: 'Amortization Calculator', icon: <CalculateIcon /> },
    { text: 'Contacts', icon: <ContactsIcon /> },
    { text: 'Pipeline Management', icon: <PipelineIcon /> },
    { text: 'Calendar', icon: <CalendarIcon /> },
    { text: 'Sales Performance', icon: <SalesIcon /> },
    { text: 'Deal Desk', icon: <DealDeskIcon /> },
    { text: 'Market Research', icon: <AssessmentIcon /> },
    { text: 'Marketing Channel', icon: <MarketingIcon /> },
    { text: 'Automation & Workflows', icon: <AutomationIcon /> },
    { text: 'Power Dialer', icon: <PhoneIcon /> },
    { text: 'Ask A.I', icon: <AIIcon /> },
    { text: 'Announcements', icon: <NotificationsIcon /> },
    { text: 'Training & Resources', icon: <TrainingIcon /> },
    { text: 'Tasks', icon: <TaskIcon /> },
    { text: 'Settings', icon: <SettingsIcon /> },
  ];

  const renderContent = () => {
    // Market Research: match exactly or by prefix so we never show Coming Soon for it
    if (selectedSection === 'Market Research' || selectedSection.startsWith('Market Research')) {
      return <MarketResearch />;
    }
    switch (selectedSection) {
      case 'Sales Performance':
        return <SalesPerformance />;
      case 'Deal Desk':
        return (
          <Box sx={{ flexGrow: 1, p: 2 }}>
            <DealDesk />
          </Box>
        );
      case 'Marketing Channel':
        return <MarketingChannel />;
      case 'Automation & Workflows':
        return <AutomationWorkflows />;
      case 'Power Dialer':
        return <PowerDialer />;
      case 'Ask A.I':
        return <AskAI />;
      case 'Contacts':
        return (
          <Contacts
            contacts={contacts}
            setContacts={setContacts}
            selectedContactId={selectedContactId}
            setSelectedContactId={setSelectedContactId}
            crmId={currentCrmId}
          />
        );
      case 'Pipeline Management':
        return (
          <PipelineManagement
            contacts={contacts}
            onUpdateContact={handleUpdateContact}
            onOpenContact={handleOpenContact}
            crmId={currentCrmId}
            crms={CRMS}
            onAddContactToOtherCrm={addContactToOtherCrm}
          />
        );
      case 'Announcements':
        return <Announcements />;
      case 'Amortization Calculator':
        return <AmortizationCalculator />;
      case 'Land Evaluation Calculator':
        return <LandCalculator />;
      case 'Training & Resources':
        return <TrainingResources />;
      case 'Settings':
        return <Settings />;
      default:
        return (
          <Typography variant="h6">
            {selectedSection} - Coming Soon
          </Typography>
        );
    }
  };

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const greenGradient = 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: greenGradient }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: greenGradient,
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Select
            value={currentCrmId}
            onChange={(e) => handleSwitchCrm(e.target.value as CrmId)}
            variant="standard"
            disableUnderline
            IconComponent={ArrowDropDownIcon}
            sx={{
              color: 'inherit',
              fontSize: '1.25rem',
              fontWeight: 600,
              minWidth: 160,
              '& .MuiSelect-select': { py: 0.5 },
              '& .MuiSvgIcon-root': { color: 'inherit' },
            }}
          >
            {CRMS.map((crm) => (
              <MenuItem key={crm.id} value={crm.id}>
                {crm.name}
              </MenuItem>
            ))}
          </Select>
          <Box sx={{ flexGrow: 1 }} />
          {onLogout && (
            <IconButton color="inherit" onClick={onLogout} aria-label="Log out" size="medium">
              <LogoutIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: theme.palette.background.paper,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={selectedSection === item.text}
                  onClick={() => setSelectedSection(item.text)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
            App: crm-system
          </Typography>
        </Box>
      </Drawer>
      <Main open={open}>
        <Toolbar />
        {renderContent()}
      </Main>
    </Box>
  );
};

export default DashboardLayout; 