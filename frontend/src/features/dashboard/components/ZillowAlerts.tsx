import React from 'react';
import { Box, Typography, Card, CardContent, Alert, AlertTitle } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * Zillow Alerts – price drops and listing alerts.
 *
 * Getting live data from Zillow:
 * - Scraping Zillow violates their Terms of Service and can lead to IP blocks or legal risk.
 * - Use legitimate options instead:
 *   1. Zillow API / partner programs (if you qualify)
 *   2. Third-party real estate data APIs (e.g. some MLS or listing aggregators)
 *   3. Zillow’s own saved searches & email alerts – user signs up on Zillow, then you could
 *      add a place here to paste or import links/addresses
 *   4. Manual entry or CSV import of price-reduced listings
 *
 * This tab can later show data from an API you’re allowed to use, or a list the user maintains.
 */
const ZillowAlerts: React.FC = () => {
  return (
    <Box sx={{ p: 2, maxWidth: 900 }}>
      <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingDownIcon /> Zillow Alerts
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Price drops & listing alerts</AlertTitle>
        Use this tab to track listings that have been reduced in price or match your criteria.
        Connect a supported data source (API or import) to show live or imported listings here.
      </Alert>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            No alerts yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            When you connect a data source or add saved searches, price-reduced and other
            matching listings will appear here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ZillowAlerts;
