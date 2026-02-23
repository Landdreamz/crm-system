from django.shortcuts import render
from decimal import Decimal
from .models import LandCompProject, Parcel

def calculate_site_prep_cost(data):
    base_cost = 0
    
    # Debris removal costs
    if data.get('debris_level') == 'heavy':
        base_cost += 5000
    
    # Slope adjustment costs
    if data.get('slope') == 'moderate':
        base_cost += 3000
    elif data.get('slope') == 'steep':
        base_cost += 7000
    
    # Tree removal costs
    if data.get('trees') == 'HEAVY_WOODS':
        base_cost += 8000
    elif data.get('trees') == 'MODERATE_WOODS':
        base_cost += 4000
    
    # Well costs
    if data.get('needs_well'):
        base_cost += 15000
    
    return base_cost

def calculate_adjusted_value(base_value, site_prep_cost, data):
    adjusted_value = Decimal(str(base_value))
    
    # Contamination risk adjustment
    if data.get('contamination_risk'):
        adjusted_value *= Decimal('0.7')  # 30% reduction
    
    # Flood zone adjustment
    if data.get('flood_zone'):
        adjusted_value *= Decimal('0.85')  # 15% reduction
    
    # County-specific adjustments (example)
    county = data.get('county', '').lower()
    if county in ['harris', 'dallas', 'travis']:
        adjusted_value *= Decimal('1.2')  # 20% premium for major counties
    
    # Subtract site prep costs
    adjusted_value -= Decimal(str(site_prep_cost))
    
    return max(adjusted_value, 0)  # Ensure value doesn't go below 0

def calculator_view(request):
    if request.method == 'POST':
        try:
            acres = Decimal(request.POST.get('acres', 0))
            base_value = Decimal(request.POST.get('base_value', 0))
            
            result = {
                'total_acres': acres,
                'total_value': base_value,
                'avg_value_per_acre': base_value / acres if acres else 0
            }
            
            LandCompProject.objects.create(
                subject_data={'acres': str(acres)},
                calculations=result
            )
            
            return render(request, 'calculator/calculator.html', {'result': result})
            
        except (ValueError, TypeError) as e:
            return render(request, 'calculator/calculator.html', {
                'errors': ['Invalid input values. Please check your entries.']
            })
    
    return render(request, 'calculator/calculator.html') 