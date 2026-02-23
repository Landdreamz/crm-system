from django.shortcuts import render
from django.http import JsonResponse
import sys
import os

# Add the land_calc directory to the path so we can import the calculator
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'land_calc'))

try:
    from land_calculator import LandCalculator
except ImportError:
    # If the import fails, we'll create a simple calculator class
    class LandCalculator:
        def calculate(self, **kwargs):
            acres = kwargs.get('acres', 0)
            base_value = kwargs.get('base_value', 0)
            
            # Simple calculation logic
            site_prep_cost = 0
            if kwargs.get('debris_level') == 'moderate':
                site_prep_cost += acres * 500
            elif kwargs.get('debris_level') == 'heavy':
                site_prep_cost += acres * 1000
                
            if kwargs.get('slope') == 'moderate':
                site_prep_cost += acres * 300
            elif kwargs.get('slope') == 'steep':
                site_prep_cost += acres * 800
                
            if kwargs.get('trees') == 'moderate':
                site_prep_cost += acres * 400
            elif kwargs.get('trees') == 'heavy':
                site_prep_cost += acres * 800
                
            if kwargs.get('needs_well'):
                site_prep_cost += 15000
                
            if kwargs.get('contamination_risk'):
                base_value *= 0.8
                
            if kwargs.get('flood_zone'):
                base_value *= 0.7
                
            # County premium
            county = kwargs.get('county', '').lower()
            if county in ['harris', 'dallas', 'travis']:
                base_value *= 1.2
                
            adjusted_value = base_value - site_prep_cost
            final_value = max(adjusted_value, base_value * 0.5)  # Minimum 50% of base value
            
            return {
                'total_acres': acres,
                'base_value': base_value,
                'site_prep_cost': site_prep_cost,
                'adjusted_value': adjusted_value,
                'final_value': final_value,
                'value_per_acre': final_value / acres if acres > 0 else 0
            }

def home(request):
    """Main page with the land calculator form"""
    return render(request, 'calculator/home.html')

def calculate(request):
    """Handle calculation requests"""
    if request.method == 'POST':
        try:
            # Get form data
            acres = float(request.POST.get('acres', 0))
            base_value = float(request.POST.get('base_value', 0))
            debris_level = request.POST.get('debris_level', 'none')
            slope = request.POST.get('slope', 'none')
            trees = request.POST.get('trees', 'none')
            needs_well = request.POST.get('needs_well') == 'on'
            contamination_risk = request.POST.get('contamination_risk') == 'on'
            flood_zone = request.POST.get('flood_zone') == 'on'
            county = request.POST.get('county', '').strip()
            
            # Create calculator instance
            calculator = LandCalculator()
            
            # Prepare parameters
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
            
            # Calculate
            result = calculator.calculate(**params)
            
            return JsonResponse({
                'success': True,
                'result': result
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
