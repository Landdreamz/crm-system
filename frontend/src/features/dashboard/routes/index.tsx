import { LandCalculator } from '../components/LandCalculator';
import { HouseCalculator } from '../components/HouseCalculator';

export const dashboardRoutes = [
  {
    path: 'land-calculator',
    element: <LandCalculator />
  },
  {
    path: 'house-calculator',
    element: <HouseCalculator />
  }
]; 