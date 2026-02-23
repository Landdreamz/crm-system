from decimal import Decimal

class LandCalculator:
    def __init__(self):
        self.site_prep_costs = {
            'debris_heavy': 5000,
            'slope_moderate': 3000,
            'slope_steep': 7000,
            'trees_heavy': 8000,
            'trees_moderate': 4000,
            'well': 15000
        }
        
        self.value_adjustments = {
            'contamination': Decimal('0.7'),  # 30% reduction
            'flood_zone': Decimal('0.85'),    # 15% reduction
            'major_county': Decimal('1.2')    # 20% premium
        }
        
        self.major_counties = ['harris', 'dallas', 'travis']
    
    def calculate(self, acres, base_value, **kwargs):
        """
        Calculate land value with adjustments.
        
        Args:
            acres (float): Land area in acres
            base_value (float): Initial land value in dollars
            **kwargs: Optional conditions (debris_level, slope, trees, etc.)
        """
        # Convert inputs to Decimal for precise calculation
        acres = Decimal(str(acres))
        base_value = Decimal(str(base_value))
        
        # Calculate site preparation costs
        site_prep_cost = Decimal('0')
        
        if kwargs.get('debris_level') == 'heavy':
            site_prep_cost += self.site_prep_costs['debris_heavy']
            
        if kwargs.get('slope') == 'moderate':
            site_prep_cost += self.site_prep_costs['slope_moderate']
        elif kwargs.get('slope') == 'steep':
            site_prep_cost += self.site_prep_costs['slope_steep']
            
        if kwargs.get('trees') == 'heavy':
            site_prep_cost += self.site_prep_costs['trees_heavy']
        elif kwargs.get('trees') == 'moderate':
            site_prep_cost += self.site_prep_costs['trees_moderate']
            
        if kwargs.get('needs_well'):
            site_prep_cost += self.site_prep_costs['well']
        
        # Apply value adjustments
        adjusted_value = base_value
        
        if kwargs.get('contamination_risk'):
            adjusted_value *= self.value_adjustments['contamination']
            
        if kwargs.get('flood_zone'):
            adjusted_value *= self.value_adjustments['flood_zone']
            
        county = kwargs.get('county', '').lower()
        if county in self.major_counties:
            adjusted_value *= self.value_adjustments['major_county']
        
        # Calculate total value per acre before site prep costs
        value_per_acre = adjusted_value / acres if acres else Decimal('0')
        
        # Subtract site preparation costs
        final_value = (adjusted_value - site_prep_cost)
        
        # Ensure value doesn't go below zero
        final_value = max(final_value, Decimal('0'))
        
        return {
            'total_acres': float(acres),
            'base_value': float(base_value),
            'site_prep_cost': float(site_prep_cost),
            'adjusted_value': float(adjusted_value),
            'final_value': float(final_value),
            'value_per_acre': float(value_per_acre)
        }

# Example usage
if __name__ == '__main__':
    calculator = LandCalculator()
    
    # Test case 1: Basic calculation
    result1 = calculator.calculate(
        acres=10,
        base_value=100000,
        debris_level='heavy',
        slope='moderate',
        trees='moderate'
    )
    print("\nTest Case 1 - Basic calculation:")
    for key, value in result1.items():
        print(f"{key}: ${value:,.2f}")
    
    # Test case 2: With all deductions
    result2 = calculator.calculate(
        acres=5,
        base_value=200000,
        debris_level='heavy',
        slope='steep',
        trees='heavy',
        needs_well=True,
        contamination_risk=True,
        flood_zone=True
    )
    print("\nTest Case 2 - All deductions:")
    for key, value in result2.items():
        print(f"{key}: ${value:,.2f}")
    
    # Test case 3: Premium location
    result3 = calculator.calculate(
        acres=2,
        base_value=150000,
        county='Dallas',
        trees='moderate'
    )
    print("\nTest Case 3 - Premium location:")
    for key, value in result3.items():
        print(f"{key}: ${value:,.2f}") 