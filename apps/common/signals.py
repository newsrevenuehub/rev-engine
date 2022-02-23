from django.dispatch import receiver

from simple_history.signals import post_create_historical_record

from apps.common.models import RevEngineHistoricalChange
from apps.common.utils import get_changes_from_prev_history_obj


@receiver(post_create_historical_record)
def post_create_historical_record_callback(sender, **kwargs):
    """
    Create a RevEngineHistoricalChange object for this change.

    Whenever django_simple_history creates an instance of one of its historical_*
    objects, we also create an instance of a RevEngineHistoricalChange.
    """
    history_instance = kwargs["history_instance"]
    changes_list = get_changes_from_prev_history_obj(history_instance)

    # Decide if a RevEngineHistoricalChange object should be created:
    #   - if the user has made changes, then create a RevEngineHistoricalChange object
    #   - if the user is creating or deleting an object, then create a
    #     RevEngineHistoricalChange object
    #   - otherwise, do not create a RevEngineHistoricalChange object
    need_to_create_historical_obj = False
    if changes_list:
        need_to_create_historical_obj = True
    elif history_instance.history_type in [
        RevEngineHistoricalChange.SIMPLE_HISTORY_TYPE_CREATED,
        RevEngineHistoricalChange.SIMPLE_HISTORY_TYPE_DELETED,
    ]:
        need_to_create_historical_obj = True
    # Create a RevEngineHistoricalChange.
    if need_to_create_historical_obj:
        RevEngineHistoricalChange.objects.create(
            app_label=kwargs["instance"]._meta.app_label,
            model=kwargs["instance"]._meta.model_name,
            object_id=kwargs["instance"].id,
            history_date=history_instance.history_date,
            history_type=history_instance.history_type,
            history_user=history_instance.history_user,
            history_change_reason=history_instance.history_change_reason or "",
            changes_html=".<br><br>".join(changes_list),
        )
