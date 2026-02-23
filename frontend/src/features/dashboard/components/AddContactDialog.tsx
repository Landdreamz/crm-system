import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  SelectChangeEvent,
  Typography,
  Stack,
} from '@mui/material';

import { Contact, NewContact } from './types';

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (contact: NewContact) => void;
  /** When set, dialog is in edit mode and calls onSave on submit */
  editContact?: Contact | null;
  onSave?: (contact: Contact) => void;
}

const getInitialFormState = (editContact?: Contact | null): NewContact => {
  if (editContact) {
    const { id, ...rest } = editContact;
    return { ...rest };
  }
  return {
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'Lead',
    leadOwner: '',
    lastContact: new Date().toISOString().split('T')[0],
    notes: '',
  };
};

const AddContactDialog: React.FC<AddContactDialogProps> = ({ open, onClose, onAdd, editContact, onSave }) => {
  const isEdit = Boolean(editContact);
  const [formData, setFormData] = React.useState<NewContact>(() => getInitialFormState(editContact));

  React.useEffect(() => {
    if (open) setFormData(getInitialFormState(editContact));
  }, [open, editContact]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: NewContact) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev: NewContact) => ({
      ...prev,
      [name]: value as NewContact['status'],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && editContact && onSave) {
      onSave({ ...formData, id: editContact.id });
    } else {
      onAdd(formData);
    }
    setFormData(getInitialFormState(null));
    onClose();
  };

  const handleCancel = () => {
    setFormData(getInitialFormState(null));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Stack spacing={2}>
            <TextField required fullWidth label="Name" name="name" value={formData.name} onChange={handleTextChange} />
            <TextField required fullWidth type="email" label="Email" name="email" value={formData.email} onChange={handleTextChange} />
            <TextField required fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleTextChange} />
            <TextField required fullWidth label="Company" name="company" value={formData.company} onChange={handleTextChange} />
            <FormControl fullWidth required>
              <InputLabel>Status</InputLabel>
              <Select name="status" value={formData.status} label="Status" onChange={handleSelectChange}>
                <MenuItem value="Lead">New Lead</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Lead Owner" name="leadOwner" value={formData.leadOwner ?? ''} onChange={handleTextChange} />
            <TextField required fullWidth type="date" label="Last Contact" name="lastContact" value={formData.lastContact} onChange={handleTextChange} InputLabelProps={{ shrink: true }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Owns multiple? &amp; extra phones</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField fullWidth size="small" label="Owns multiple?" name="ownsMultiple" value={formData.ownsMultiple ?? ''} onChange={handleTextChange} sx={{ minWidth: 120 }} />
              {([2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => (
                <TextField key={n} size="small" label={`Phone ${n}`} name={`phone${n}`} value={(formData as unknown as Record<string, string>)[`phone${n}`] ?? ''} onChange={handleTextChange} sx={{ minWidth: 130 }} />
              ))}
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Mailing</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField fullWidth size="small" label="Mailing Address" name="mailingAddress" value={formData.mailingAddress ?? ''} onChange={handleTextChange} />
              <TextField size="small" label="Mailing City" name="mailingCity" value={formData.mailingCity ?? ''} onChange={handleTextChange} sx={{ minWidth: 140 }} />
              <TextField size="small" label="Mailing State" name="mailingState" value={formData.mailingState ?? ''} onChange={handleTextChange} sx={{ width: 90 }} />
              <TextField size="small" label="Mailing Zip" name="mailingZip" value={formData.mailingZip ?? ''} onChange={handleTextChange} sx={{ width: 100 }} />
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Property address &amp; details</Typography>
            <Stack spacing={1}>
              <TextField fullWidth size="small" label="Address" name="address" value={formData.address ?? ''} onChange={handleTextChange} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField size="small" label="City" name="city" value={formData.city ?? ''} onChange={handleTextChange} sx={{ minWidth: 140 }} />
                <TextField size="small" label="State" name="state" value={formData.state ?? ''} onChange={handleTextChange} sx={{ width: 90 }} />
                <TextField size="small" label="Zip" name="zip" value={formData.zip ?? ''} onChange={handleTextChange} sx={{ width: 100 }} />
                <TextField size="small" label="County" name="county" value={formData.county ?? ''} onChange={handleTextChange} sx={{ minWidth: 120 }} />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField size="small" label="Property Type" name="propertyType" value={formData.propertyType ?? ''} onChange={handleTextChange} sx={{ minWidth: 130 }} />
                <TextField size="small" label="Lot Size (sqft)" name="lotSizeSqft" value={formData.lotSizeSqft ?? ''} onChange={handleTextChange} sx={{ width: 110 }} />
                <TextField size="small" label="Acres" name="acres" value={formData.acres ?? ''} onChange={handleTextChange} sx={{ width: 80 }} />
                <TextField size="small" label="Subdivision" name="subdivision" value={formData.subdivision ?? ''} onChange={handleTextChange} sx={{ minWidth: 120 }} />
                <TextField size="small" label="Total Assessed Value" name="totalAssessedValue" value={formData.totalAssessedValue ?? ''} onChange={handleTextChange} sx={{ width: 130 }} />
                <TextField size="small" label="Estimated Value" name="estimatedValue" value={formData.estimatedValue ?? ''} onChange={handleTextChange} sx={{ width: 130 }} />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField size="small" label="APN" name="apn" value={formData.apn ?? ''} onChange={handleTextChange} sx={{ width: 120 }} />
                <TextField size="small" label="Topography" name="topography" value={formData.topography ?? ''} onChange={handleTextChange} sx={{ minWidth: 100 }} />
                <TextField size="small" label="Latitude" name="latitude" value={formData.latitude ?? ''} onChange={handleTextChange} sx={{ width: 110 }} />
                <TextField size="small" label="Longitude" name="longitude" value={formData.longitude ?? ''} onChange={handleTextChange} sx={{ width: 110 }} />
              </Stack>
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Tax &amp; sales</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="Tax Delinquent" name="taxDelinquent" value={formData.taxDelinquent ?? ''} onChange={handleTextChange} sx={{ minWidth: 110 }} />
              <TextField size="small" label="Tax Delinquent Year" name="taxDelinquentYear" value={formData.taxDelinquentYear ?? ''} onChange={handleTextChange} sx={{ width: 130 }} />
              <TextField size="small" label="Tax Amount Due" name="taxAmountDue" value={formData.taxAmountDue ?? ''} onChange={handleTextChange} sx={{ width: 120 }} />
              <TextField size="small" label="Sales Price" name="salesPrice" value={formData.salesPrice ?? ''} onChange={handleTextChange} sx={{ width: 110 }} />
              <TextField size="small" type="date" label="Sales Date" name="salesDate" value={formData.salesDate ?? ''} onChange={handleTextChange} InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
            </Stack>

            <TextField fullWidth size="small" label="Data Source" name="dataSource" value={formData.dataSource ?? ''} onChange={handleTextChange} />

            <TextField fullWidth label="Notes" name="notes" value={formData.notes ?? ''} onChange={handleTextChange} multiline rows={3} placeholder="Additional info, follow-up reminders, etc." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {isEdit ? 'Save' : 'Add Contact'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddContactDialog; 