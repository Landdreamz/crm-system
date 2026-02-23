from land_calculator import LandCalculator

def get_yes_no_input(prompt):
    while True:
        response = input(prompt + " (y/n): ").lower()
        if response in ['y', 'yes']:
            return True
        elif response in ['n', 'no']:
            return False
        print("Please enter 'y' or 'n'")

def get_numeric_input(prompt, min_value=0):
    while True:
        try:
            value = float(input(prompt))
            if value >= min_value:
                return value
            print(f"Please enter a value greater than or equal to {min_value}")
        except ValueError:
            print("Please enter a valid number")

def get_condition_level(prompt):
    while True:
        level = input(prompt + " (none/moderate/heavy): ").lower()
        if level in ['none', 'moderate', 'heavy']:
            return level
        print("Please enter 'none', 'moderate', or 'heavy'")

def get_slope_type():
    while True:
        slope = input("Enter slope condition (none/moderate/steep): ").lower()
        if slope in ['none', 'moderate', 'steep']:
            return slope
        print("Please enter 'none', 'moderate', or 'steep'")

def main():
    calculator = LandCalculator()
    
    print("\n=== Texas Land Value Calculator ===\n")
    
    # Get basic information
    acres = get_numeric_input("Enter number of acres: ")
    base_value = get_numeric_input("Enter base value ($): ")
    
    # Get site conditions
    print("\n--- Site Conditions ---")
    debris_level = get_condition_level("Enter debris level")
    slope = get_slope_type()
    trees = get_condition_level("Enter tree density")
    needs_well = get_yes_no_input("Does the site need a well")
    
    # Get risk factors
    print("\n--- Risk Factors ---")
    contamination_risk = get_yes_no_input("Is there contamination risk")
    flood_zone = get_yes_no_input("Is the property in a flood zone")
    
    # Get location information
    print("\n--- Location Information ---")
    print("Major counties (premium pricing): Harris, Dallas, Travis")
    county = input("Enter county name (or press Enter to skip): ").strip()
    
    # Prepare calculation parameters
    params = {
        'acres': acres,
        'base_value': base_value,
        'county': county
    }
    
    # Add conditional parameters
    if debris_level != 'none':
        params['debris_level'] = debris_level
    if slope != 'none':
        params['slope'] = slope
    if trees != 'none':
        params['trees'] = trees
    if needs_well:
        params['needs_well'] = True
    if contamination_risk:
        params['contamination_risk'] = True
    if flood_zone:
        params['flood_zone'] = True
    
    # Calculate and display results
    result = calculator.calculate(**params)
    
    print("\n=== Calculation Results ===")
    print(f"\nProperty Details:")
    print(f"- Total Acres: {result['total_acres']:,.2f}")
    print(f"- Base Value: ${result['base_value']:,.2f}")
    
    print(f"\nAdjustments:")
    print(f"- Site Preparation Costs: ${result['site_prep_cost']:,.2f}")
    print(f"- Adjusted Value: ${result['adjusted_value']:,.2f}")
    
    print(f"\nFinal Values:")
    print(f"- Final Property Value: ${result['final_value']:,.2f}")
    print(f"- Value per Acre: ${result['value_per_acre']:,.2f}")
    
    # Calculate total impact of adjustments
    total_impact = result['final_value'] - result['base_value']
    impact_percentage = (total_impact / result['base_value']) * 100
    print(f"\nTotal Value Impact: ${total_impact:,.2f} ({impact_percentage:,.1f}%)")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nCalculator closed.")
    except Exception as e:
        print(f"\nAn error occurred: {e}") 