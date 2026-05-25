export function requireSession(req, res) {
  const session = req.cookies?.session;
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}
