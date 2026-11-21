# Evidence record: log-based CDC figures

- **Steps:** A and G of `docs/VISUAL_VERIFICATION.md`.
- **Access date:** every source was read on **21 Nov 2026**.
- **Verification status:** verified on 21 Nov 2026, after two separate review passes (see review notes).

## Versions in force when verified

| Source | Version |
|---|---|
| PostgreSQL documentation | 19 (released 19 Nov 2026). Version 18 pages were also read where 19 changed behaviour |
| MySQL Reference Manual | 8.4, cross-checked against 26.10 for the sentences relied on |
| Debezium | 3.7 (stable). Tested by the project against PostgreSQL 14 to 18 and MySQL 8.0, 8.4 and 9.7 |
| Apache Kafka | 4.4 |
| Snowflake, BigQuery, AWS DMS | Current, unversioned documentation |

## Claims and their sources

| # | Claim used in the figures or text | Source | Status |
|---|---|---|---|
| 1 | Log-based CDC decodes committed changes from the transaction log (PostgreSQL WAL; MySQL binary log) | [PostgreSQL: Logical Decoding Concepts](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html); [MySQL 8.4: The Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html) | Established |
| 2 | Replication slots retain the WAL a consumer may still need, even without a connection; retention is unlimited by default (`max_slot_wal_keep_size = -1`) | [PostgreSQL: Replication Slots](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS); [PostgreSQL: Replication settings](https://www.postgresql.org/docs/current/runtime-config-replication.html) | Established |
| 3 | `wal_level=logical` is required through PostgreSQL 18; PostgreSQL 19 needs only `replica` and raises the effective level automatically | [PostgreSQL 18: Logical Decoding Examples](https://www.postgresql.org/docs/18/logicaldecoding-example.html); [PostgreSQL 19 release notes](https://www.postgresql.org/docs/current/release-19.html) | Established, version-specific |
| 4 | MySQL CDC needs row-based binary logging; Debezium requires `binlog_row_image=FULL` | [Debezium MySQL connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html); [AWS DMS: ongoing replication](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html) | Established |
| 5 | Initial consistent snapshot, then streaming from the recorded position; a purged position needs a new snapshot | [Debezium MySQL connector, snapshots](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-snapshots); [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html) | Established |
| 6 | Change events carry op, before and after images, and source metadata with the log position. The top-level `ts_ms` is processing time on the connector's clock | [Debezium PostgreSQL connector, events](https://debezium.io/documentation/reference/stable/connectors/postgresql.html#postgresql-create-events) | Established, Debezium-specific |
| 7 | At-least-once delivery during fault recovery, so duplicates must be expected. Exactly-once is opt-in and covers only the write into Kafka | [Debezium: Exactly once delivery](https://debezium.io/documentation/reference/stable/configuration/eos.html); [Kafka 4.4: delivery semantics](https://kafka.apache.org/44/design/design/#message-delivery-semantics) | Established |
| 8 | Same key goes to the same partition; order is guaranteed within a partition only | [Kafka 4.4: Introduction](https://kafka.apache.org/44/getting-started/introduction/#main-concepts-and-terminology) | Established |
| 9 | Deletes produce a delete event (plus a tombstone by default); MySQL InnoDB cascade deletes are not in the binlog | [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html); [MySQL 8.4: InnoDB and MySQL Replication](https://dev.mysql.com/doc/refman/8.4/en/innodb-and-mysql-replication.html) | Established |
| 10 | PostgreSQL logical decoding does not carry DDL; MySQL DDL is kept in an internal schema history topic | [Debezium PostgreSQL connector, limitations](https://debezium.io/documentation/reference/stable/connectors/postgresql.html#postgresql-limitations); [Debezium MySQL connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html) | Established |
| 11 | Snowflake MERGE errors by default when a target row joins several source rows for update or delete, and inserts duplicate unmatched source rows. BigQuery errors when an updating MERGE matches more than one source row | [Snowflake: MERGE](https://docs.snowflake.com/en/sql-reference/sql/merge); [BigQuery: DML syntax](https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax) | Established |
| 12 | QUALIFY filters the results of window functions (used in the SQL example) | [Snowflake: QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify) | Established |
| 13 | Log position orders changes and detects duplicates; MySQL order needs file, position and row | [PostgreSQL: Replication Slots](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS); [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html) (tracking the LSN to spot duplicates); [Debezium MySQL connector, events](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-create-events) | Established. "Safer than timestamps" is **technical analysis** |
| 14 | Polling an updated-at column misses deletes and intermediate updates | [Debezium: Features](https://debezium.io/documentation/reference/stable/features.html); [Debezium blog, 2018](https://debezium.io/blog/2018/07/19/advantages-of-log-based-change-data-capture/) | Established (maintainer source) |
| 15 | Monitoring: slot `wal_status` and `safe_wal_size`, connector lag metrics, DMS latency metrics; MySQL binlogs expire on a timer (30 days by default) | [PostgreSQL: pg_replication_slots](https://www.postgresql.org/docs/current/view-pg-replication-slots.html); [Debezium MySQL streaming metrics](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-streaming-metrics); [AWS DMS: monitoring](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html) | Established |
| 16 | AWS DMS to S3 adds an I/U/D operation column; by default it does not write changes in transaction order; CDC is not real-time and has no latency SLA | [AWS DMS: S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html); [AWS DMS: ongoing replication](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html) | Established |

## Technical analysis and design choices (not sourced facts; labelled as such in the text)

- **Order "latest wins" by log position, not by timestamp.** Sources support position for ordering and duplicate detection. The comparison with timestamps is my reasoning.
- **"Apply only if the log position is newer than the stored one."** This guard is a design choice. It stops an older replayed change arriving in a later batch from regressing a row.
- **Soft deletes.** They keep the key and its position, so the same guard also stops an older replayed insert from bringing back a deleted row. A hard delete leaves nothing to compare against.
- **Reconciliation of counts and totals between source and target.** This is an operating practice, not a product feature.

## Review notes

**Draft 1 check against this record.**
- The checkpoint box sat inside the source boundary as "log position kept for capture". That is true for PostgreSQL, whose slot is on the server, but not for MySQL, where the capture tool keeps the offset.
- Relabelled to "PostgreSQL: replication slot. MySQL: offset kept by capture."
- A Figure 2 label collided with an arrow, and repeated spaces collapsed. Both were fixed.

**Separate review pass (round 1, 21 Nov 2026).**

A separate review pass was given only this record, `spec.md`, the rendered figures and the entry text, and asked the step D questions. Its verdict: the logic of figure 2 was correct, but the SQL and several claims were not. Its findings and their resolutions:

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | Example SQL mishandled nulls. Snowflake sorts `DESC` nulls first; null stored positions blocked updates; null or unnormalised `op` values were dropped; truncates have no key | High | Filter rows with no key or position, normalise `op` when rows land, guard on `t.log_position IS NULL OR …`, insert deleted markers. Logic run in `merge_logic_test.py` (all assertions pass) |
| 2 | "Moves every committed change" and similar unqualified claims, plus loss after capture through topic or file retention | High | Claims narrowed to what capture reads from the log; loss through retention added; load-lag monitoring added to figure 1 |
| 3 | "Nothing suggests timestamps" was wrong: AWS DMS documents `TimestampColumnName` | High | Text now cites it and explains ties, labelled as analysis |
| 4 | Figure 2 never exercised the guard, because the duplicates lost within the batch | Medium | Batch 3 and run 3 added: a replay-only batch that the guard rejects; caption credits dedup within a batch and the guard across batches |
| 5 | "Restarts from its last committed offset (pos 101)" implied 101 is re-sent | Medium | Reworded to "resumes after" |
| 6 | Soft deletes were only half-protected, because a delete for an unseen key was dropped | Medium | `WHEN NOT MATCHED` now inserts a deleted marker; tested |
| 7 | A load-time watermark can skip late-committing rows; the bind syntax is Snowflake-specific | Medium | Placeholder labelled; overlap guidance added (safe because of the guard) |
| 8 | A re-snapshot does not remove rows deleted in the gap; MySQL positions differ after failover | Medium | Rows deleted in the gap: figure 2 footer and the text. MySQL failover: the text only |
| 9 | Figure 1 did not show the stored position or the guard | Medium | Current-state table relabelled: "one row per key, with its log position; MERGE applies only newer changes; deletes kept as soft deletes" |
| 10 | Figure 1 had no path for the snapshot; the trade-offs omitted snapshot load and locks | Medium | "snapshot" arrow from the database to capture added; trade-off row updated (MySQL locks sourced) |
| 11 | "30 days by default" is true only for self-managed MySQL | Medium | Scoped; Amazon RDS for MySQL default (no retention unless `binlog retention hours` is set, at most 168) added with source |
| 12 | DMS S3 files carry no position by default; I/U/D applies only to CDC records | Medium | Stated, with the `AR_H_*` header columns (empty for full load) sourced |
| 13 | Convergence was stated without its conditions | Medium | Conditions listed in the text |
| 14 | Monitoring covered only the source side | Medium | Load lag against topic and file retention added (figure 1 and text) |
| 15 | Two PostgreSQL limits were stated inaccurately | Medium | Replaced with the PG 19 CREATE PUBLICATION statements (replica identity; `publish_generated_columns = stored`, from PG 18) |
| 16–24 | Lows: "commits" to "writes"; slot link to capture; "row image" missing from landing; diamond gap; tag placement; title mismatch; DMS at-least-once source; MySQL position encoding; dated version statements | Low | All fixed. Figure titles are now identical in the SVG and `figures.ts` |

**Sources added for round 1:**
- PostgreSQL CREATE PUBLICATION (PG 19);
- Amazon RDS binlog retention;
- AWS DMS transformation-rule header columns.

Each was read on 21 Nov 2026 and quoted against the review.

**Wording deliberately avoided** on both figures:
- "exactly-once";
- "real-time";
- "captures every change" without qualification;
- "globally ordered";
- "`wal_level=logical` required" without a version;
- "`ts_ms` = commit time".

**Sources added in rounds 1 and 2, with the sentence relied on.** All were read on 21 Nov 2026.

| Claim | Source | Verbatim (≤ 25 words) |
|---|---|---|
| Amazon RDS for MySQL keeps no binlogs by default; maximum 168 h | [Amazon RDS: mysql.rds_set_configuration](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-configuring.html) | "The default value of binlog retention hours is NULL. For RDS for MySQL, NULL means binary logs aren't retained (0 hours)." / "the maximum binlog retention hours value is 168 (7 days)" |
| Published tables without a replica identity reject UPDATE/DELETE | [PostgreSQL 19: CREATE PUBLICATION](https://www.postgresql.org/docs/current/sql-createpublication.html) | "must have REPLICA IDENTITY defined. Otherwise those operations will be disallowed on those tables." |
| Stored generated columns can be published (PG 18+) | same | "Stored generated columns can also be replicated if publish_generated_columns is set to stored" |
| Debezium's pgoutput does not capture generated columns | [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html) | "the pgoutput logical decoding output plug-in does not capture values for generated columns" |
| Unchanged TOAST values are left out of update events | same | "Values that were stored by using the TOAST mechanism and that have not been changed are not included in the message, unless they are part of the table's replica identity." |
| MySQL snapshot lock scope (default `minimal`) and table-level locks on hosted options | [Debezium MySQL connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html) | "The connector holds the global read lock for only the initial phase of the snapshot during which it reads the database schemas and other metadata." / "the connector uses table-level locks" |
| DMS header columns `AR_H_STREAM_POSITION` and `AR_H_CHANGE_SEQ`; empty for full load | [AWS DMS: transformation-rule expressions](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Expressions.html) | "AR_H_CHANGE_SEQ A unique incrementing number from the source database that consists of a timestamp and an auto incrementing number." Full-load value: "An empty string." |
| DMS commit-timestamp column; transfer time for full load | [AWS DMS: S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html) | "configure the TimestampColumnName endpoint setting to include the source commit timestamp for each row" / "For a full load, each row of this timestamp column contains a timestamp for when the data was transferred" |
| DMS duplicates on S3 during full load: two cases | same | "If there is intensive writing to the source table during the full load phase, DMS may write duplicate records to the S3 bucket or cached changes." / "with a TargetTablePrepMode of DO_NOTHING, DMS may write duplicate records … if the task stops and resumes abruptly during the full load phase" |
| Snowflake IFF (used in the SQL) | [Snowflake: IFF](https://docs.snowflake.com/en/sql-reference/functions/iff) | "If condition evaluates to TRUE, returns expr1, otherwise returns expr2." (so a NULL condition returns `expr2`, as `CASE` does) |

**Sources added after the rules review (21 Nov 2026).** The review found three claims in the entry without a row here: repeated messages in PostgreSQL, the clock in Debezium's lag metric, and TOAST. The table below adds them, plus verbatim quotes for three claims already listed in the claims table (DMS latency metrics, `wal_level` through PostgreSQL 18, Debezium's tested versions). Each was read on 21 Nov 2026.

| Claim | Source | Verbatim (≤ 25 words) |
|---|---|---|
| PostgreSQL logical decoding clients must handle repeated messages | [PostgreSQL: Logical Decoding Concepts](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html) | "Logical decoding clients are responsible for avoiding ill effects from handling the same message more than once." |
| Debezium's lag metric includes clock differences | [Debezium MySQL connector, streaming metrics](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-streaming-metrics) | "The values will incorporate any differences between the clocks on the machines where the database server and the connector are running." |
| DMS latency metrics `CDCLatencySource` and `CDCLatencyTarget` | [AWS DMS: monitoring](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html) | "The CDCLatencySource and CDCLatencyTarget can be used to identify the cause of latency in a task by comparing these related statistics." |
| TOAST is PostgreSQL's storage for large field values (replaces an "around 8 KB" figure, which the PostgreSQL docs do not support) | [PostgreSQL 19: TOAST](https://www.postgresql.org/docs/current/storage-toast.html) | "large field values are compressed and/or broken up into multiple physical rows" |
| `wal_level=logical` required through PostgreSQL 18 | [PostgreSQL 18: Logical Decoding Examples](https://www.postgresql.org/docs/18/logicaldecoding-example.html) | "Before you can use logical decoding, you must set wal_level to logical and max_replication_slots to at least 1." |
| Debezium 3.7 is tested against PostgreSQL 14 to 18 | [Debezium 3.7 release overview](https://debezium.io/releases/3.7/) | Tested versions table, PostgreSQL row: "Database 14, 15, 16, 17, 18" |

**Sources added after the second rules review (21 Nov 2026).** Five more sentences in the entry had no row. Each was read on 21 Nov 2026.

| Claim | Source | Verbatim (≤ 25 words) |
|---|---|---|
| PostgreSQL 19 raises the effective WAL level when the first logical slot is created | [PostgreSQL 19: Write Ahead Log](https://www.postgresql.org/docs/current/runtime-config-wal.html) | "The system automatically increases the effective WAL level to logical when creating the first logical replication slot" |
| Debezium 3.7 still documents `wal_level=logical` | [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html) | "specify the following in the postgresql.conf file: wal_level=logical max_wal_senders=1 max_replication_slots=1" |
| Debezium suggests tracking the LSN to spot duplicates | same | "Consumers can keep track of this information, especially the LSN, to determine whether an event is a duplicate." |
| A MySQL offset is a binlog file and position, or a GTID set | [Debezium MySQL connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html) | "you specify either the binlog file and position, or a GTID set, depending on whether GTID (Global Transaction Identifier) mode is enabled" |
| Debezium fails over between MySQL replicas with GTIDs, once the new replica has caught up | same | "can fail over to different multi-primary MySQL replicas as long as the new replica is caught up to the old replica" |

The entry's remaining sentence on MySQL failover, that stored binlog positions cannot be compared with the new server's, is labelled as analysis in the text.

**Separate review pass (round 2, 21 Nov 2026).**

A second review pass checked each round-1 fix. It confirmed findings 1–7, 9–12 and 14–24 as fixed, and findings 8 and 13 as partly fixed (8's record is now corrected above). It ran `merge_logic_test.py` (passes) and raised new findings:

| # | Finding | Severity | Resolution |
|---|---|---|---|
| R2-22 | Figure 1's at-least-once note was applied to the DMS path, where DMS documents duplicates only during full load | Medium | Note reworded to "Duplicates are possible: tolerate them downstream"; the DMS duplicate source added to the caption, description and text |
| M1 | Re-snapshot rows with a low placeholder position are rejected for existing keys, so updates are not repaired either | Medium | Text now says so, with the fix: rebuild, or give snapshot rows the snapshot's own position. Debezium snapshot rows already carry one |
| M2 | `AR_H_CHANGE_SEQ` was called a log position | Medium | Both headers described as AWS defines them, with the need to convert them into one sortable value |
| M3 | Convergence conditions presented as complete | Medium | "At least these conditions"; retention loss, skipped landing rows and complete row images added |
| M4 | PostgreSQL TOAST: unchanged large values are missing from update events | Medium | Added to the SQL assumptions and the convergence conditions, with the Debezium quote |
| M5 | The claims table lacked quotes for the round-1 sources | Medium | The table above |
| L1–L8 | TimestampColumnName on full load; slot wording; lock wording; figure 2 legend; test wording; status mismatch; generated columns in Debezium 3.7; load-lag connector | Low | All fixed. Figure 1 now has a monitoring link to the change files for retention and load lag |

**Rules review (21 Nov 2026).** A final review of the whole site found three gaps in this entry, all fixed:
- the DMS duplicate sentence had dropped the `DO_NOTHING` condition (text and figure 1 description now give both cases, quoted above);
- the TOAST line carried an "around 8 KB" figure (removed);
- three claims had no row here (added above), and five sources were missing from the entry's reference list: the PostgreSQL 18 logical decoding example, PostgreSQL TOAST, the Debezium 3.7 release overview, Snowflake IFF and AWS DMS monitoring (all added).

**Second rules review (21 Nov 2026).** It found five sentences without a row (added above) and one source missing from the entry's reference list, PostgreSQL 19's Write Ahead Log settings (added).

**Verification status: verified, 21 Nov 2026.** Every finding from both figure review rounds and both rules reviews was fixed. Each factual sentence that the reviews checked in the figures and the entry maps to a row in this record, or is labelled as analysis in the text.
