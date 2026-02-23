from django.db import models
from django.utils import timezone

class LandCompProject(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('NEEDS_REVIEW', 'Needs Review'),
        ('COMPLETED', 'Completed'),
        ('OFFER_ACCEPTED', 'Offer Accepted'),
    ]
    subject_data = models.JSONField()  # Stores property details (address, parcel_id, etc.)
    calculations = models.JSONField(default=dict)  # Stores calculated values (offer_price, etc.)
    comps = models.JSONField(default=list)  # List of comparable properties
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Project {self.id} - {self.subject_data.get('property_address', 'Unnamed')}"

class Parcel(models.Model):
    project = models.ForeignKey(LandCompProject, on_delete=models.CASCADE, related_name='parcels')
    parcel_id = models.CharField(max_length=50)
    acres = models.DecimalField(max_digits=8, decimal_places=4)
    sq_ft = models.DecimalField(max_digits=12, decimal_places=2)
    county_value = models.DecimalField(max_digits=12, decimal_places=2)
    legal_description = models.TextField()
    coordinates = models.CharField(max_length=50)

    def __str__(self):
        return f"Parcel {self.parcel_id} for Project {self.project.id}"

class CRMAction(models.Model):
    ACTION_TYPES = [
        ('CALL', 'Schedule Call'),
        ('EMAIL', 'Send Email'),
        ('TASK', 'Create Task'),
        ('OFFER', 'Generate Offer'),
    ]
    project = models.ForeignKey(LandCompProject, on_delete=models.CASCADE, related_name='crm_actions')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    scheduled_time = models.DateTimeField()
    notes = models.TextField()
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.action_type} for Project {self.project.id}" 