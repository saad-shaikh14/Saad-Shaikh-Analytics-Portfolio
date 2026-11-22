# Spec: log-based CDC into an analytical warehouse (figures 1 and 2)

Step B of `docs/VISUAL_VERIFICATION.md`. Written before drawing; the figures were checked against it afterwards. It was updated on 21 Nov 2026 with the changes from the two review rounds, and on 22 Nov 2026 after the pull-request review of the ordering key (see `sources.md`), so it describes the published figures.

## Figure 1: reference blueprint

- **What it explains:** how committed changes in an operational database become current-state tables in a warehouse, using log-based change data capture, and where duplicates are made harmless.
- **Pattern:** log-based CDC with an initial snapshot, an append-only landing layer, deduplication to the latest change per key, and a position-guarded MERGE into current state.
- **Level of abstraction:** a vendor-neutral reference design. Product names appear only as examples in brackets. It is not a diagram of a deployed system.

### Components and relationships (data flow, left to right)

1. Operational database (e.g. PostgreSQL, MySQL) → transaction log, labelled "writes" (changes are recorded in the WAL or the row-based binary log).
2. Database → CDC capture, labelled "snapshot", and transaction log → CDC capture, labelled "stream". The capture box says it snapshots the tables, then streams from the recorded log position, and keeps its own offset (step 1).
3. On PostgreSQL only, a replication slot box inside the source boundary ("Replication slot: keeps WAL capture may still need"), with a link from capture labelled "confirms position".
4. CDC capture → either a change event log keyed by primary key (e.g. a Kafka topic), or change files in object storage with an operation column (e.g. DMS) (step 2).
5. → Landing table: append-only change records with key, operation, row image, log position and load time (step 3).
6. Landing → deduplicate: latest change per key, ordered by log position (step 4, highlighted).
7. Deduplicate → current-state tables: one row per key with its log position; MERGE applies only newer changes; deletes kept as soft deletes (step 5, highlighted).
8. Current-state tables → consumers: models, BI, services (step 6).

### Boundaries and control

- **Source system** boundary: the database, its log and, on PostgreSQL, the replication slot.
  - PostgreSQL keeps the position in a replication slot on the server.
  - MySQL's position is an offset kept by the capture tool. The capture box says "keeps its own offset".
- **Analytical warehouse** boundary: landing, deduplicate, current state.
- **Control (dashed):** an orchestrator schedules and triggers each warehouse run.
- **Metadata (dotted):**
  - monitoring reads capture lag, load lag and retention: slot WAL growth or binlog expiry, and topic or file retention. It links to the replication slot, the capture process and the change files;
  - reconciliation reads row counts and totals from the source and the target.

### Assumptions and limits shown on or under the figure

- Duplicates are possible on both transport paths. The figure carries the note "Duplicates are possible: tolerate them downstream". The caption and text give the sources: Debezium's at-least-once delivery during fault recovery, and the AWS DMS full-load cases.
- Per-key ordering is assumed within a partition (stated in the text, not the figure).
- Not shown, but covered in the text:
  - schema-change handling;
  - cascade deletes in MySQL;
  - DDL in PostgreSQL logical decoding;
  - tables without primary keys;
  - TOAST values missing from PostgreSQL update events.

### Missing-element check (step C)

| Element | Decision |
|---|---|
| Ingestion | Included |
| Storage | Included |
| Processing | Included |
| Transformation | Included (deduplicate and MERGE) |
| Orchestration | Included |
| Monitoring | Included (capture lag, load lag, retention) |
| Data quality | Included (reconciliation) |
| Recovery | Figure 2 |
| Security and identity | Omitted: not the subject; the text notes that capture needs replication privileges |
| Governance | Omitted |
| Cost | Omitted from the figure; it is a trade-off in the text |

## Figure 2: failure, replay and convergence

- **What it explains:** why a capture restart produces duplicates, and how "latest per key by log position" within a batch, plus "apply only if newer" across batches, makes the target converge on the source and stay there.
- **Scenario:** five committed changes (positions 101 to 105) for keys A and B: insert A = v1, update A = v2, insert B = v1, update A = v3, delete B.
- **Positions:** the footnote reads "pos = ordering key: commit order, and the same value if redelivered (built per source; see text)". The source lane's subtitle is "committed changes, in commit order". The text defines the key per source (PostgreSQL commit LSN then change LSN; MySQL binlog file, position, snapshot rank and row).
- **Batches delivered to landing (append-only, so duplicates are kept):**
  - Batch 1 delivers 101 to 103.
  - Batch 2: the capture restarted and resumed after its last committed offset (101), so 102 and 103 arrive again, then 104 and 105.
  - Batch 3: a later replay of 102 and 103 only.
- **Runs:**
  - Run 1 keeps A at 102 and B at 103. With no stored positions yet, both are applied: A = v2, B = v1.
  - Run 2 keeps A at 104 and B at 105, so the duplicate rows for 102 and 103 lose inside the batch. Both are newer than the stored positions, so both are applied: A = v3, B deleted and kept as a soft delete at 105. Re-running run 2 changes nothing.
  - Run 3 keeps A at 102 and B at 103. Both are older than the stored 104 and 105, so the guard skips them and B stays deleted. The table is unchanged.
- **Numbered steps 1 to 6:** the restart, run 2's deduplication, run 2's guarded apply, the converged table, batch 3, and run 3's rejection.
- **Failure branch (footer):** if the recorded position is no longer in the log (WAL removed past a slot limit, or binlog expired), capture cannot resume from it. Take a new snapshot, then rebuild or reconcile the target against it, because a snapshot holds only rows that still exist.
- **Labelled as design choices:** the position guard and soft deletes. They are not product features.
