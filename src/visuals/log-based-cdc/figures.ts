import Figure1 from './figure-1.svg';
import Figure2 from './figure-2.svg';
import type { Visual } from '../types';

// Smallest text in both SVGs is 12 units on a 1160-unit viewBox, so at 1160 CSS px or wider every label
// renders at >= 12 px. Narrower screens scroll the figure instead of shrinking it (docs/DESIGN_SYSTEM.md).
const MIN_WIDTH = 1160;

export const logBasedCdc: Visual = {
  entry: 'log-based-cdc-into-a-warehouse',
  figures: [
    {
      number: 1,
      title: 'Reference blueprint: log-based change data capture into an analytical warehouse',
      caption:
        'Changes flow left to right, from a database’s tables and transaction log to current-state tables. The copper path is where duplicates are removed and only newer changes are applied. Duplicates are possible on both transport paths, so the warehouse side must tolerate them.',
      description: [
        'An application writes to an operational database, which records changes in its transaction log: the write-ahead log in PostgreSQL, or the row-based binary log in MySQL.',
        'Step 1: a CDC capture process (for example Debezium or AWS DMS) snapshots the tables, then streams committed changes from the log position recorded at the snapshot, and keeps its own offset. On PostgreSQL it also confirms its position to a replication slot, which keeps the WAL that capture may still need on the source.',
        'Step 2: change events, keyed by the table’s primary key, go either to a change event log such as a Kafka topic, or to change files in object storage with an operation column (for example AWS DMS writing to Amazon S3).',
        'Step 3: the warehouse loads them, append-only, into a landing table that keeps the key, operation, row image, source log position and load time.',
        'Step 4: for the rows loaded since the last run, a deduplication step keeps only the latest change per key, ordered by log position.',
        'Step 5: a MERGE applies those changes to current-state tables, which hold one row per key with its log position. A change is applied only if its position is newer than the stored one, and deletes are kept as soft deletes.',
        'Step 6: models, BI tools and services read the current-state tables.',
        'An orchestrator triggers each warehouse run. Monitoring watches capture lag, load lag and retention: WAL held by a PostgreSQL slot, binlog expiry in MySQL, and the retention of the event log or files. Reconciliation compares row counts and totals between source and target.',
        'A note on the figure: duplicates are possible, so the warehouse side must tolerate them. Debezium documents at-least-once delivery during recovery from a fault; AWS DMS documents that it may write duplicate records to S3 during the full load phase, when the source table is written intensively, or, with TargetTablePrepMode set to DO_NOTHING, when a task stops and resumes abruptly.',
      ],
      sourceNote:
        'A reference design drawn from the official documentation listed under References; product names in brackets are examples, not requirements. It is not a diagram of any specific deployment.',
      status: 'verified',
      minWidth: MIN_WIDTH,
      legend: [
        { term: 'Data flow', meaning: 'changes moving between components', swatch: 'data' },
        { term: 'Control', meaning: 'a trigger or schedule', swatch: 'control' },
        { term: 'Metadata', meaning: 'positions, metrics and reconciliation reads', swatch: 'metadata' },
        { term: 'Highlighted path', meaning: 'deduplicate, then guarded merge', swatch: 'highlight' },
        { term: 'Step', meaning: 'numbered as in the text', swatch: 'step' },
        { term: 'Boundary', meaning: 'system or ownership', swatch: 'system' },
      ],
      component: Figure1,
    },
    {
      number: 2,
      title: 'Failure and recovery: duplicates after a restart, and convergence through a position-guarded merge',
      caption:
        'Within a batch, keeping the latest change per key removes duplicates. Across batches, applying a change only if its log position is newer than the stored one stops an old replay from undoing newer data, so the target converges on the source and stays there. Dashed boxes are changes delivered again.',
      description: [
        'The source log holds five committed changes at positions 101 to 105: insert A = v1, update A = v2, insert B = v1, update A = v3, delete B. A position here is the ordering key defined in the text: it follows commit order for each key, and a redelivered change keeps the same value.',
        'Batch 1 delivers 101, 102 and 103 to the landing table. Run 1 keeps the latest change per key (A at 102, B at 103); the target has no stored positions yet, so both are applied: A = v2, B = v1.',
        'Step 1: the capture restarts and resumes after its last committed offset, position 101, so batch 2 delivers 102 and 103 again, then 104 and 105. The landing table is append-only and keeps all of them.',
        'Step 2: run 2 keeps the latest change per key, A at 104 and B at 105, so the duplicate rows for 102 and 103 lose inside the batch.',
        'Step 3: both are newer than the stored positions (102 and 103), so both are applied. Re-running run 2 changes nothing, because no row is newer than what is stored.',
        'Step 4: the current-state table now matches the source log: A = v3 at position 104, and B deleted, kept as a soft delete at position 105.',
        'Step 5: a later replay, batch 3, delivers only 102 and 103 again.',
        'Step 6: run 3 keeps A at 102 and B at 103. Both are older than the stored 104 and 105, so the guard skips them, and B stays deleted because its soft-delete row still holds position 105. The table is unchanged.',
        'If the recorded position is no longer in the log, because the WAL was removed past a slot limit or the binlog expired, capture cannot resume from it. A new snapshot is needed, and the target must be rebuilt or reconciled against it, because a snapshot holds only rows that still exist.',
      ],
      sourceNote:
        'Restart and duplicate behaviour is documented by Debezium and Kafka (see References). The “apply only if newer” guard and the soft delete are design choices explained in the text, not features of any product; the merge logic was run against this scenario.',
      status: 'verified',
      minWidth: MIN_WIDTH,
      legend: [
        { term: 'Data flow', meaning: 'rows moving between stages', swatch: 'data' },
        { term: 'Highlighted path', meaning: 'run 3, the replay the position check rejects', swatch: 'highlight' },
        { term: 'Step', meaning: 'numbered as in the text', swatch: 'step' },
      ],
      component: Figure2,
    },
  ],
};
