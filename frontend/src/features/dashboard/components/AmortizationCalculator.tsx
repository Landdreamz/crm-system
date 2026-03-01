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
  Grid,
} from '@mui/material';
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

const AmortizationCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [loanTerm, setLoanTerm] = useState<string>('');
  const [schedule, setSchedule] = useState<PaymentRow[]>([]);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);

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
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Loan Amortization Calculator
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Loan Amount ($)"
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Annual Interest Rate (%)"
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Loan Term (Years)"
            type="number"
            value={loanTerm}
            onChange={(e) => setLoanTerm(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={calculateAmortization}
            sx={{ minWidth: '200px' }}
          >
            Calculate
          </Button>
        </Box>

        {schedule.length > 0 && (
          <>
            <SummaryBox>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
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
                    Total Cost
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
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
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
    </Box>
  );
};

export default AmortizationCalculator; 