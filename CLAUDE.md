# CLAUDE.md

## API Error Handling

All endpoints use try-catch + error codes:

```js
app.get('/api/clients', async (req, res) => {
  try { ... } catch(e) {
    res.status(500).json({ error: msg });
  }
});
```
