from django.dispatch import Signal

# Emitted when a new HelpRequest is created
# Kwargs: help_request, created_by_user
help_request_created = Signal()

# Emitted when a HelpRequest transitions status (e.g. pending -> in_progress, in_progress -> resolved)
# Kwargs: help_request, old_status, new_status, by_user
help_request_status_changed = Signal()
