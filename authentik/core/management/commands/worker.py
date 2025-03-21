"""Run worker"""

from sys import exit as sysexit
from tempfile import tempdir

from celery.apps.worker import Worker
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from structlog.stdlib import get_logger

from authentik.lib.config import CONFIG
from authentik.lib.debug import start_debug_server
from authentik.root.celery import CELERY_APP

LOGGER = get_logger()


class Command(BaseCommand):
    """Run worker"""

    def add_arguments(self, parser):
        parser.add_argument(
            "-b",
            "--beat",
            action="store_false",
            help="When set, this worker will _not_ run Beat (scheduled) tasks",
        )

    def handle(self, **options):
        LOGGER.debug("Celery options", **options)
        close_old_connections()
        start_debug_server()
        worker: Worker = CELERY_APP.Worker(
            no_color=False,
            quiet=True,
            optimization="fair",
            autoscale=(CONFIG.get_int("worker.concurrency"), 1),
            task_events=True,
            beat=options.get("beat", True),
            schedule_filename=f"{tempdir}/celerybeat-schedule",
            queues=["authentik", "authentik_scheduled", "authentik_events"],
        )
        for task in CELERY_APP.tasks:
            LOGGER.debug("Registered task", task=task)

        worker.start()
        sysexit(worker.exitcode)
