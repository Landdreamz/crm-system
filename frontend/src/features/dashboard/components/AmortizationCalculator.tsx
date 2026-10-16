import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  InputAdornment,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import TerraScoutXTab from './TerraScoutXTab';
import { styled } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

interface PaymentRow {
  paymentNumber: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

const COLORS = ['#0088FE', '#00C49F'];

/** Compact inputs; hide number spinners for a calmer field. */
const amortizationTextFieldSx = {
  width: '100%',
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    lineHeight: 1.25,
  },
  '& .MuiOutlinedInput-root': {
    fontSize: '0.875rem',
  },
  '& .MuiOutlinedInput-input': {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    paddingTop: '10px',
    paddingBottom: '10px',
  },
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
} as const;

const FIELD_HINT_MIN_HEIGHT = 36;

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      component="div"
      sx={{
        minHeight: FIELD_HINT_MIN_HEIGHT,
        mt: 0.5,
        lineHeight: 1.35,
        fontSize: '0.7rem',
      }}
    >
      {children}
    </Typography>
  );
}

type AmortizationTab = 'calculator' | 'terra-scout-x';

const AmortizationCalculator: React.FC = () => {
  const [tab, setTab] = useState<AmortizationTab>('calculator');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [loanTerm, setLoanTerm] = useState<string>('');
  const [schedule, setSchedule] = useState<PaymentRow[]>([]);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);

  const syncLoanFromPurchaseAndDown = (purchaseStr: string, downStr: string) => {
    const p = parseFloat(purchaseStr);
    if (!Number.isFinite(p) || purchaseStr.trim() === '') return;
    const d = downStr.trim() === '' ? 0 : parseFloat(downStr);
    if (!Number.isFinite(d)) return;
    const financed = Math.max(0, p - d);
    setLoanAmount(String(financed));
  };

  const calculateAmortization = () => {
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate) / 100;
    const monthlyRate = annualRate / 12;
    const months = parseInt(loanTerm) * 12;

    const monthlyPmt =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    let balance = principal;
    const newSchedule: PaymentRow[] = [];
    let totalInterestPaid = 0;

    for (let i = 1; i <= months; i++) {
      const interest = balance * monthlyRate;
      const principalPart = monthlyPmt - interest;
      balance -= principalPart;
      totalInterestPaid += interest;

      newSchedule.push({
        paymentNumber: i,
        payment: monthlyPmt,
        principal: principalPart,
        interest: interest,
        remainingBalance: Math.max(0, balance),
      });
    }

    setSchedule(newSchedule);
    setTotalInterest(totalInterestPaid);
    setMonthlyPayment(monthlyPmt);
  };

  const getChartData = () => {
    return schedule.map((row) => ({
      month: row.paymentNumber,
      Principal: row.principal,
      Interest: row.interest,
      Balance: row.remainingBalance,
    }));
  };

  const getPieChartData = () => {
    return [
      { name: 'Principal', value: parseFloat(loanAmount) },
      { name: 'Total Interest', value: totalInterest },
    ];
  };

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, value: AmortizationTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<CalculateIcon />} iconPosition="start" label="Amortization" value="calculator" />
          <Tab icon={<TravelExploreIcon />} iconPosition="start" label="Terra Scout X" value="terra-scout-x" />
        </Tabs>
      </Paper>

      {tab === 'terra-scout-x' && <TerraScoutXTab />}

      {tab === 'calculator' && (
      <StyledPaper>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Loan amortization calculator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          Purchase price and down payment update the loan amount automatically. You can still edit the loan amount directly.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
          Purchase &amp; financing
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small"
              fullWidth
              label="Purchase price"
              type="number"
              value={purchasePrice}
              onChange={(e) => {
                const v = e.target.value;
                setPurchasePrice(v);
                syncLoanFromPurchaseAndDown(v, downPayment);
              }}
              inputProps={{ min: 0 }}
              sx={amortizationTextFieldSx}
            />
            <FieldHint>Loan = price minus down payment</FieldHint>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small"
              fullWidth
              label="Down payment"
              type="number"
              value={downPayment}
              onChange={(e) => {
                const v = e.target.value;
                setDownPayment(v);
                syncLoanFromPurchaseAndDown(purchasePrice, v);
              }}
              inputProps={{ min: 0 }}
              sx={amortizationTextFieldSx}
            />
            <FieldHint>Leave blank to use $0</FieldHint>
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <TextField
              size="small"
              fullWidth
              label="Loan amount"
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              sx={amortizationTextFieldSx}
            />
            <FieldHint>Amount financed (editable)</FieldHint>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
          Loan terms
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              fullWidth
              label="Annual interest rate"
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary" sx={{ userSelect: 'none' }}>
                      %
                    </Typography>
                  </InputAdornment>
                ),
              }}
              sx={amortizationTextFieldSx}
            />
            <FieldHint>APR as a percent (e.g. 6.5)</FieldHint>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              fullWidth
              label="Loan term"
              type="number"
              value={loanTerm}
              onChange={(e) => setLoanTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary" sx={{ userSelect: 'none' }}>
                      yr
                    </Typography>
                  </InputAdornment>
                ),
              }}
              sx={amortizationTextFieldSx}
            />
            <FieldHint>Length of the loan in years</FieldHint>
          </Grid>
        </Grid>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 1.5,
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button variant="contained" onClick={calculateAmortization} size="large" sx={{ minWidth: 200, px: 3 }}>
            Calculate
          </Button>
        </Box>

        {schedule.length > 0 && (
          <>
            <SummaryBox>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                {purchasePrice.trim() !== '' && Number.isFinite(parseFloat(purchasePrice)) && (
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Total purchase price
                    </Typography>
                    <Typography variant="h6">
                      ${parseFloat(purchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                )}
                {(downPayment.trim() !== '' ? Number.isFinite(parseFloat(downPayment)) : purchasePrice.trim() !== '') && (
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Down payment
                    </Typography>
                    <Typography variant="h6">
                      $
                      {(downPayment.trim() === '' ? 0 : parseFloat(downPayment)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Monthly Payment
                  </Typography>
                  <Typography variant="h6">
                    ${monthlyPayment.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Interest
                  </Typography>
                  <Typography variant="h6">
                    ${totalInterest.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total loan cost (principal + interest)
                  </Typography>
                  <Typography variant="h6">
                    ${(parseFloat(loanAmount) + totalInterest).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </SummaryBox>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
              <Box sx={{ flex: '2 1 600px' }}>
                <Typography variant="h6" gutterBottom>
                  Payment Breakdown Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Principal"
                      stroke="#0088FE"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Interest"
                      stroke="#00C49F"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Balance"
                      stroke="#FF8042"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ flex: '1 1 300px' }}>
                <Typography variant="h6" gutterBottom>
                  Total Payment Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            <Typography variant="h6" gutterBottom>
              Amortization Schedule
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Payment #</TableCell>
                    <TableCell align="right">Payment</TableCell>
                    <TableCell align="right">Principal</TableCell>
                    <TableCell align="right">Interest</TableCell>
                    <TableCell align="right">Remaining Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.paymentNumber}>
                      <TableCell>{row.paymentNumber}</TableCell>
                      <TableCell align="right">
                        ${row.payment.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        ${row.principal.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        ${row.interest.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        ${row.remainingBalance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </StyledPaper>
      )}
    </Box>
  );
};

export default AmortizationCalculator; 