# Executes the entry's MERGE logic (DuckDB dialect; same clauses as the Snowflake example) against the
# figure 2 scenario, a third replay-only run, an insert+delete in one batch, and rows with missing key/position.
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE landing_changes (load_id INT, key VARCHAR, op VARCHAR, value VARCHAR, log_position BIGINT)")
con.execute("CREATE TABLE current_state (key VARCHAR PRIMARY KEY, value VARCHAR, is_deleted BOOLEAN, log_position BIGINT)")
MERGE = """
MERGE INTO current_state AS t
USING (
  SELECT key, op, value, log_position
  FROM landing_changes
  WHERE load_id > ?
    AND key IS NOT NULL
    AND log_position IS NOT NULL
    AND op IN ('c', 'r', 'u', 'd')
  QUALIFY ROW_NUMBER() OVER (PARTITION BY key ORDER BY log_position DESC) = 1
) AS s
ON t.key = s.key
WHEN MATCHED AND (t.log_position IS NULL OR s.log_position > t.log_position) AND s.op = 'd' THEN
  UPDATE SET is_deleted = TRUE, log_position = s.log_position
WHEN MATCHED AND (t.log_position IS NULL OR s.log_position > t.log_position) THEN
  UPDATE SET value = s.value, is_deleted = FALSE, log_position = s.log_position
WHEN NOT MATCHED THEN
  INSERT (key, value, is_deleted, log_position)
  VALUES (s.key, CASE WHEN s.op = 'd' THEN NULL ELSE s.value END, s.op = 'd', s.log_position)
"""
def load(load_id, rows):
    con.executemany("INSERT INTO landing_changes VALUES (?, ?, ?, ?, ?)", [(load_id, *r) for r in rows])
def run(after_load):
    con.execute(MERGE, [after_load])
def state():
    return con.execute("SELECT key, value, is_deleted, log_position FROM current_state ORDER BY key").fetchall()

# Run 1: positions 101-103 delivered once.
load(1, [("A", "c", "v1", 101), ("A", "u", "v2", 102), ("B", "c", "v1", 103)])
run(0); s1 = state(); print("after run 1:", s1)
assert s1 == [("A", "v2", False, 102), ("B", "v1", False, 103)]

# Restart: 102 and 103 re-delivered, then 104 and 105; plus rows that must be ignored.
load(2, [("A", "u", "v2", 102), ("B", "c", "v1", 103), ("A", "u", "v3", 104), ("B", "d", None, 105),
         ("A", "u", "WRONG-no-position", None), (None, "t", None, 106)])
run(1); s2 = state(); print("after run 2:", s2)
assert s2 == [("A", "v3", False, 104), ("B", "v1", True, 105)]  # soft delete keeps the last value, flagged deleted

# Re-run run 2 (same window): nothing changes.
run(1); assert state() == s2; print("re-run of run 2: unchanged")

# Run 3: a later replay delivers only the old 102 and 103: guard rejects both; B stays deleted.
load(3, [("A", "u", "v2", 102), ("B", "c", "v1", 103)])
run(2); s3 = state(); print("after run 3:", s3)
assert s3 == s2

# Insert and delete of a new key C in one batch: kept as a deleted marker, so an old replayed insert cannot resurrect it.
load(4, [("C", "c", "x", 201), ("C", "d", None, 202)])
run(3); assert ("C", None, True, 202) in state()
load(5, [("C", "c", "x", 201)])
run(4); assert ("C", None, True, 202) in state(); print("C stays deleted after replayed insert")

# A target row loaded earlier without a position (e.g. a bulk backfill) is updated by the first real change.
con.execute("INSERT INTO current_state VALUES ('D', 'old', FALSE, NULL)")
load(6, [("D", "u", "new", 301)])
run(5); assert ("D", "new", False, 301) in state(); print("null stored position updated by first change")
print("ALL ASSERTIONS PASSED")
