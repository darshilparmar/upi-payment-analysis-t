#!/usr/bin/env python3
"""
Drain the app's outbox into Azure Event Hubs (Module 6).

This is the piece that turns the shop into a *streaming* source. It reads
unpublished rows from ``payment_events``, sends them to Event Hubs, and marks
them published.

**Why an outbox at all.** The obvious design is: update the payment, then
publish to the queue. That's the **dual-write problem** — two systems, one
process, no shared transaction. Crash in between and you get either a row with
no event (the lakehouse never learns the payment settled) or an event with no
row (the lakehouse learns about something that didn't happen). Neither is
detectable after the fact and neither is fixable in general.

The outbox removes the second write: the app writes the event into the *same*
database in the *same* transaction as the row change. This publisher then moves
it out, and if it crashes the row is simply still unpublished — so it sends
again next run. That gives **at-least-once**, which is why every consumer
downstream must dedup. It cannot give exactly-once, and anyone who tells you
their queue does is describing a different problem.

💳 Event Hubs is a paid Azure resource (Basic tier is cheap). ``--target stdout``
prints the events instead, and ``--target file`` writes JSONL you can replay —
both keep the Free Edition path working.

Usage::

    python scripts/outbox_publisher.py --target stdout --limit 20
    python scripts/outbox_publisher.py --target eventhubs --loop
    python scripts/outbox_publisher.py --target file --out /tmp/events.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

try:
    import psycopg
except ImportError:                                    # pragma: no cover
    sys.exit("pip install 'psycopg[binary]' first")


def fetch_batch(conn, limit: int):
    """
    Claim a batch of unpublished events.

    ``FOR UPDATE SKIP LOCKED`` so two publishers can run side by side without
    fighting over the same rows — the standard way to make a queue out of a
    table. ``ORDER BY event_id`` keeps per-key ordering, which matters because a
    payment's PENDING must not overtake its SUCCESS on the way out.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT event_id, txn_id, event_type, payload, occurred_at
              FROM payment_events
             WHERE published_at IS NULL
             ORDER BY event_id
             LIMIT %s
             FOR UPDATE SKIP LOCKED
            """,
            (limit,),
        )
        return cur.fetchall()


def mark_published(conn, event_ids: list[int]):
    if not event_ids:
        return
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE payment_events SET published_at = now() WHERE event_id = ANY(%s)",
            (event_ids,),
        )


def to_event(row) -> dict:
    event_id, txn_id, event_type, payload, occurred_at = row
    return {
        "event_id": event_id,
        "event_type": event_type,
        "event_time": occurred_at.astimezone(timezone.utc).isoformat(),
        "payload": payload,
    }


class StdoutSink:
    def send(self, events): [print(json.dumps(e)) for e in events]
    def close(self): pass


class FileSink:
    def __init__(self, path): self.f = open(path, "a")
    def send(self, events): [self.f.write(json.dumps(e) + "\n") for e in events]; self.f.flush()
    def close(self): self.f.close()


class EventHubSink:
    """
    Batched producer.

    Events are **partitioned by ``txn_id``**, not round-robined. Event Hubs only
    guarantees ordering within a partition, so every event for one payment has
    to land in the same one — otherwise a SUCCESS can be processed before the
    PENDING that preceded it and your consumer needs even more defensive logic
    than it already has.
    """

    def __init__(self, conn_str: str, name: str):
        from azure.eventhub import EventHubProducerClient
        self.producer = EventHubProducerClient.from_connection_string(conn_str, eventhub_name=name)

    def send(self, events):
        from azure.eventhub import EventData
        by_key: dict[str, list] = {}
        for e in events:
            by_key.setdefault(e["payload"].get("txn_id", "none"), []).append(e)

        for key, group in by_key.items():
            batch = self.producer.create_batch(partition_key=key)
            for e in group:
                try:
                    batch.add(EventData(json.dumps(e)))
                except ValueError:                 # batch full — send and start another
                    self.producer.send_batch(batch)
                    batch = self.producer.create_batch(partition_key=key)
                    batch.add(EventData(json.dumps(e)))
            self.producer.send_batch(batch)

    def close(self):
        self.producer.close()


def build_sink(args):
    if args.target == "stdout":
        return StdoutSink()
    if args.target == "file":
        return FileSink(args.out)
    conn_str = os.getenv("EVENTHUB_CONNECTION_STRING")
    if not conn_str:
        sys.exit("EVENTHUB_CONNECTION_STRING is not set")
    return EventHubSink(conn_str, os.getenv("EVENTHUB_NAME", "upi-payments"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", choices=["eventhubs", "stdout", "file"], default="stdout")
    ap.add_argument("--out", default="events.jsonl", help="for --target file")
    ap.add_argument("--limit", type=int, default=500, help="events per batch")
    ap.add_argument("--loop", action="store_true", help="keep running")
    ap.add_argument("--interval", type=float, default=2.0, help="seconds between polls when looping")
    args = ap.parse_args()

    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL is not set (the same Neon string the app uses)")

    sink = build_sink(args)
    total = 0
    try:
        with psycopg.connect(dsn) as conn:
            while True:
                rows = fetch_batch(conn, args.limit)
                if rows:
                    events = [to_event(r) for r in rows]
                    sink.send(events)
                    # Mark published only AFTER the send returns. Crash before this
                    # and the events go again next run — at-least-once, on purpose.
                    mark_published(conn, [r[0] for r in rows])
                    conn.commit()
                    total += len(rows)
                    print(f"[{datetime.now():%H:%M:%S}] published {len(rows)} (total {total})",
                          file=sys.stderr)
                elif not args.loop:
                    print("nothing to publish", file=sys.stderr)

                if not args.loop:
                    break
                time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\nstopped after {total} events", file=sys.stderr)
    finally:
        sink.close()


if __name__ == "__main__":
    main()
