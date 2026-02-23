import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const SummaryBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3),
}));

interface PropertyDetails {
  acreage: number;
  locationType: string;
  zoning: string;
  roadAccess: boolean;
  utilities: boolean;
}

interface ComparableSale {
  address: string;
  acreage: number;
  salePrice: number;
  pricePerAcre: number;
  dateOfSale: string;
}

const LandOfferCalculator: React.FC = () => {
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({
    acreage: 0,
    locationType: 'rural',
    zoning: 'residential',
    roadAccess: true,
    utilities: true,
  });

  const [comparables, setComparables] = useState<ComparableSale[]>([]);
  const [adjustmentFactors, setAdjustmentFactors] = useState({
    location: 0,
    development: 0,
    access: 0,
    utilities: 0,
  });

  const [basePrice, setBasePrice] = useState<number>(0);
  const [finalOffer, setFinalOffer] = useState<number>(0);

  const handlePropertyChange = (field: keyof PropertyDetails, value: any) => {
    setPropertyDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleComparableAdd = () => {
    const newComparable: ComparableSale = {
      address: '',
      acreage: 0,
      salePrice: 0,
      pricePerAcre: 0,
      dateOfSale: new Date().toISOString().split('T')[0],
    };
    setComparables([...comparables, newComparable]);
  };

  const handleComparableChange = (index: number, field: keyof ComparableSale, value: any) => {
    const updatedComparables = [...comparables];
    updatedComparables[index] = {
      ...updatedComparables[index],
      [field]: value,
      pricePerAcre: field === 'salePrice' || field === 'acreage' 
        ? value / updatedComparables[index].acreage
        : updatedComparables[index].pricePerAcre,
    };
    setComparables(updatedComparables);
  };

  const calculateOffer = () => {
    // Calculate average price per acre from comparables
    const avgPricePerAcre = comparables.reduce((acc, curr) => 
      acc + curr.pricePerAcre, 0) / comparables.length;

    // Calculate base price
    const calculatedBasePrice = avgPricePerAcre * propertyDetails.acreage;
    setBasePrice(calculatedBasePrice);

    // Apply adjustment factors
    const totalAdjustment = 
      (adjustmentFactors.location / 100) +
      (adjustmentFactors.development / 100) +
      (adjustmentFactors.access / 100) +
      (adjustmentFactors.utilities / 100);

    const calculatedFinalOffer = calculatedBasePrice * (1 + totalAdjustment);
    setFinalOffer(calculatedFinalOffer);
  };

  const getChartData = () => {
    return [
      {
        name: 'Base Price',
        amount: basePrice,
      },
      {
        name: 'Final Offer',
        amount: finalOffer,
      },
    ];
  };

  return (
    <Box>
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Land Offer Calculator
        </Typography>

        {/* Property Details Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Property Details
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Acreage"
              type="number"
              value={propertyDetails.acreage}
              onChange={(e) => handlePropertyChange('acreage', parseFloat(e.target.value))}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">acres</InputAdornment>,
              }}
            />
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={propertyDetails.locationType}
                label="Location Type"
                onChange={(e) => handlePropertyChange('locationType', e.target.value)}
              >
                <MenuItem value="rural">Rural</MenuItem>
                <MenuItem value="suburban">Suburban</MenuItem>
                <MenuItem value="urban">Urban</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <InputLabel>Zoning</InputLabel>
              <Select
                value={propertyDetails.zoning}
                label="Zoning"
                onChange={(e) => handlePropertyChange('zoning', e.target.value)}
              >
                <MenuItem value="residential">Residential</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="agricultural">Agricultural</MenuItem>
                <MenuItem value="industrial">Industrial</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Comparables Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Comparable Sales
            </Typography>
            <Button variant="outlined" onClick={handleComparableAdd}>
              Add Comparable
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Address</TableCell>
                  <TableCell>Acreage</TableCell>
                  <TableCell>Sale Price</TableCell>
                  <TableCell>Price/Acre</TableCell>
                  <TableCell>Date of Sale</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparables.map((comp, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={comp.address}
                        onChange={(e) => handleComparableChange(index, 'address', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={comp.acreage}
                        onChange={(e) => handleComparableChange(index, 'acreage', parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={comp.salePrice}
                        onChange={(e) => handleComparableChange(index, 'salePrice', parseFloat(e.target.value))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      ${comp.pricePerAcre.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        value={comp.dateOfSale}
                        onChange={(e) => handleComparableChange(index, 'dateOfSale', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Adjustment Factors Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Adjustment Factors
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography gutterBottom>Location Quality Adjustment (%)</Typography>
              <Slider
                value={adjustmentFactors.location}
                onChange={(_, value) => setAdjustmentFactors(prev => ({ ...prev, location: value as number }))}
                min={-50}
                max={50}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box>
              <Typography gutterBottom>Development Potential (%)</Typography>
              <Slider
                value={adjustmentFactors.development}
                onChange={(_, value) => setAdjustmentFactors(prev => ({ ...prev, development: value as number }))}
                min={-50}
                max={50}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box>
              <Typography gutterBottom>Access Quality (%)</Typography>
              <Slider
                value={adjustmentFactors.access}
                onChange={(_, value) => setAdjustmentFactors(prev => ({ ...prev, access: value as number }))}
                min={-50}
                max={50}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box>
              <Typography gutterBottom>Utilities Availability (%)</Typography>
              <Slider
                value={adjustmentFactors.utilities}
                onChange={(_, value) => setAdjustmentFactors(prev => ({ ...prev, utilities: value as number }))}
                min={-50}
                max={50}
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={calculateOffer}
          sx={{ mb: 3 }}
          fullWidth
        >
          Calculate Offer
        </Button>

        {finalOffer > 0 && (
          <>
            <SummaryBox>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Base Price (from comparables)
                  </Typography>
                  <Typography variant="h6">
                    ${basePrice.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Price per Acre
                  </Typography>
                  <Typography variant="h6">
                    ${(basePrice / propertyDetails.acreage).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Final Offer
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ${finalOffer.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </SummaryBox>

            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </StyledPaper>
    </Box>
  );
};

export default LandOfferCalculator; 