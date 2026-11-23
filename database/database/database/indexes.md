# Indexes

Run in mongosh after `use lanepulse`:

```js
db.users.createIndex({ email: 1 }, { unique: true })
db.simulations.createIndex({ session_id: 1 }, { unique: true })
```

Why: validation cannot stop duplicates. A unique index guarantees
one email per user and one session_id per simulation.

## Useful update queries

Mark an intersection as crossed:

```js
db.simulations.updateOne(
  { session_id: "abc123", "intersections.order": 1 },
  { $set: { "intersections.$.crossed": true } }
)
```

Record signal release (dot notation keeps the other signal fields):

```js
db.simulations.updateOne(
  { session_id: "abc123", "intersections.order": 1 },
  { $set: { "intersections.$.signal.released_at": new Date() } }
)
```
