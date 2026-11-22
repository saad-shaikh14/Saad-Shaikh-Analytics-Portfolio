# Executes the entry's tie check and MERGE logic (DuckDB dialect; same clauses as the Snowflake example) against:
#   1. the figure 2 scenario (runs 1 to 3), an insert and delete of a new key in one batch, rows with a missing key or
#      position, and a stored row with no position;
#   2. PostgreSQL: a transaction that wrote a row before the snapshot point and committed after it, with the raw
#      change LSN as the key (wrong result) and with the commit-ordered key (right result);
#   3. MySQL: a snapshot row and a streamed change at the same binlog coordinates, without and with the snapshot rank;
#   4. equal positions: an exact redelivered duplicate (harmless) and a conflicting tie (the run stops);
#   5. a re-snapshot after the log moved on: snapshot rows at the snapshot's own position, at a low placeholder,
#      and a rebuild that removes a row deleted during the gap.
# Usage: python merge_logic_test.py   (needs the duckdb package)
import duckdb

TIE_CHECK = """
SELECT key, log_position
FROM landing_changes
WHERE load_id > ?
GROUP BY key, log_position
HAVING COUNT(DISTINCT hash(op, value)) > 1
"""

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


class TieFound(Exception):
    pass


class Pipeline:
    """One landing table and one current-state table, as in the entry."""

    def __init__(self):
        self.con = duckdb.connect()
        self.con.execute("CREATE TABLE landing_changes (load_id INT, key VARCHAR, op VARCHAR, value VARCHAR, log_position BIGINT)")
        self.con.execute("CREATE TABLE current_state (key VARCHAR PRIMARY KEY, value VARCHAR, is_deleted BOOLEAN, log_position BIGINT)")

    def load(self, load_id, rows):
        self.con.executemany("INSERT INTO landing_changes VALUES (?, ?, ?, ?, ?)", [(load_id, *r) for r in rows])

    def run(self, after_load):
        ties = self.con.execute(TIE_CHECK, [after_load]).fetchall()
        if ties:
            raise TieFound(ties)  # the run stops before the MERGE
        self.con.execute(MERGE, [after_load])

    def state(self):
        return self.con.execute("SELECT key, value, is_deleted, log_position FROM current_state ORDER BY key").fetchall()

    def row(self, key):
        return next((r for r in self.state() if r[0] == key), None)


# Ordering keys, built when rows land (see the entry, "Order by a commit-ordered position").
def pg_key(commit_lsn, change_lsn):
    """PostgreSQL: commit LSN first, then the change's own LSN within the transaction."""
    assert 0 <= change_lsn < 1000
    return commit_lsn * 1000 + change_lsn


def mysql_key(file_seq, pos, row, snapshot):
    """MySQL: binlog file sequence, position, then snapshot rows (rank 0) below streamed changes (rank 1), then row."""
    return ((file_seq * 100000 + pos) * 10 + (0 if snapshot else 1)) * 100 + row


def mysql_key_without_rank(file_seq, pos, row):
    return (file_seq * 100000 + pos) * 100 + row


# ---------------------------------------------------------------- 1. figure 2, and the basic cases
p = Pipeline()
p.load(1, [("A", "c", "v1", 101), ("A", "u", "v2", 102), ("B", "c", "v1", 103)])
p.run(0); s1 = p.state(); print("1. after run 1:", s1)
assert s1 == [("A", "v2", False, 102), ("B", "v1", False, 103)]

# Restart: 102 and 103 re-delivered, then 104 and 105; plus rows that must be ignored.
p.load(2, [("A", "u", "v2", 102), ("B", "c", "v1", 103), ("A", "u", "v3", 104), ("B", "d", None, 105),
           ("A", "u", "WRONG-no-position", None), (None, "t", None, 106)])
p.run(1); s2 = p.state(); print("1. after run 2:", s2)
assert s2 == [("A", "v3", False, 104), ("B", "v1", True, 105)]  # soft delete keeps the last value, flagged deleted

p.run(1); assert p.state() == s2; print("1. re-run of run 2: unchanged")

# Run 3: a later replay delivers only the old 102 and 103: the guard rejects both; B stays deleted.
p.load(3, [("A", "u", "v2", 102), ("B", "c", "v1", 103)])
p.run(2); assert p.state() == s2; print("1. after run 3: unchanged, B stays deleted")

# Insert and delete of a new key C in one batch: a deleted marker, so an old replayed insert cannot resurrect it.
p.load(4, [("C", "c", "x", 201), ("C", "d", None, 202)])
p.run(3); assert p.row("C") == ("C", None, True, 202)
p.load(5, [("C", "c", "x", 201)])
p.run(4); assert p.row("C") == ("C", None, True, 202); print("1. C stays deleted after a replayed insert")

# A target row loaded earlier without a position (e.g. a bulk backfill) is updated by the first real change.
p.con.execute("INSERT INTO current_state VALUES ('D', 'old', FALSE, NULL)")
p.load(6, [("D", "u", "new", 301)])
p.run(5); assert p.row("D") == ("D", "new", False, 301); print("1. null stored position updated by the first change")

# ---------------------------------------------------------------- 2. PostgreSQL: commit after the snapshot point
# Snapshot taken at LSN 100 sees A = v0. Transaction T1 wrote A = v1 at LSN 90, before the snapshot point, and
# committed at LSN 110, after it, so the snapshot did not see it and streaming delivers it.
raw = Pipeline()
raw.load(1, [("A", "r", "v0", 100)])          # snapshot row, raw position = snapshot LSN
raw.run(0)
raw.load(2, [("A", "u", "v1", 90)])           # T1's change, raw position = its own LSN
raw.run(1)
assert raw.row("A") == ("A", "v0", False, 100), raw.state()
print("2. raw change LSN as the key: committed update rejected, A stays v0 (wrong, as the entry warns)")

good = Pipeline()
good.load(1, [("A", "r", "v0", pg_key(100, 0))])   # snapshot rows take the snapshot's position
good.run(0)
good.load(2, [("A", "u", "v1", pg_key(110, 90))])  # commit LSN first, change LSN second
good.run(1)
assert good.row("A") == ("A", "v1", False, pg_key(110, 90)), good.state()
# Redelivery of T1's change gets the same key, so it is ignored.
good.load(3, [("A", "u", "v1", pg_key(110, 90))])
good.run(2); assert good.row("A")[1] == "v1"
print("2. commit-ordered key: committed update applied, A = v1; its redelivery changes nothing")

# Two changes to one key inside one transaction keep their order through the change LSN.
good.load(4, [("A", "u", "v2", pg_key(120, 101)), ("A", "u", "v3", pg_key(120, 105))])
good.run(3); assert good.row("A")[1] == "v3"; print("2. two changes in one transaction: the later one wins")

# ---------------------------------------------------------------- 3. MySQL: snapshot row and streamed change tie
tie = Pipeline()
tie.load(1, [("B", "r", "v0", mysql_key_without_rank(3, 500, 0)), ("B", "u", "v1", mysql_key_without_rank(3, 500, 0))])
try:
    tie.run(0)
    raise AssertionError("the tie check should have stopped this run")
except TieFound as e:
    print("3. without the snapshot rank: the tie check stops the run:", e.args[0])

ranked = Pipeline()
ranked.load(1, [("B", "r", "v0", mysql_key(3, 500, 0, snapshot=True)), ("B", "u", "v1", mysql_key(3, 500, 0, snapshot=False))])
ranked.run(0)
assert ranked.row("B")[1] == "v1", ranked.state()
print("3. with the snapshot rank: the streamed change wins, B = v1")

# ---------------------------------------------------------------- 4. equal positions
dup = Pipeline()
dup.load(1, [("E", "c", "e1", 700), ("E", "c", "e1", 700)])  # an exact duplicate in one batch
dup.run(0)
dup.load(2, [("E", "c", "e1", 700)])                         # and again in a later batch
dup.run(1)
assert dup.state() == [("E", "e1", False, 700)]
print("4. exact duplicates at one position: harmless, E = e1")

conflict = Pipeline()
conflict.load(1, [("E", "u", "e1", 700), ("E", "u", "e2", 700)])  # two different changes at one position
try:
    conflict.run(0)
    raise AssertionError("the tie check should have stopped this run")
except TieFound as e:
    assert conflict.state() == []  # nothing was merged
    print("4. conflicting tie: the run stops before the MERGE:", e.args[0])

# ---------------------------------------------------------------- 5. re-snapshot after the log moved on
# Stored: A = v3 at 104 and F = f1 at 106. While capture was stopped, A became v5 and F was deleted.
# The new snapshot is taken at position 500.
def stored():
    q = Pipeline()
    q.load(1, [("A", "u", "v3", 104), ("F", "c", "f1", 106)])
    q.run(0)
    return q

low = stored()
low.load(2, [("A", "r", "v5", 0)])          # snapshot rows given a low placeholder position
low.run(1)
assert low.row("A")[1] == "v3"
print("5. re-snapshot with a low placeholder: the update is rejected, A stays v3 (wrong, as the entry warns)")

own = stored()
own.load(2, [("A", "r", "v5", 500)])        # snapshot rows given the snapshot's own position
own.run(1)
assert own.row("A")[1] == "v5" and own.row("F") == ("F", "f1", False, 106)
print("5. re-snapshot at its own position: A = v5, but F, deleted during the gap, is still present")

rebuilt = Pipeline()                        # rebuild: a fresh target loaded from the snapshot alone
rebuilt.load(1, [("A", "r", "v5", 500)])
rebuilt.run(0)
assert rebuilt.state() == [("A", "v5", False, 500)]
print("5. rebuild from the snapshot: A = v5 and F is gone")

print("ALL ASSERTIONS PASSED")
