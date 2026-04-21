function registerProfilesRoutes(app, ctx) {
  const {
    fs,
    path,
    PROFILE_STORE_DIR,
    loadProfilesData,
    saveProfilesData,
    createProfileSnapshot,
    applyProfileSnapshot,
    appendActivity,
    loadRotation,
    saveRotation,
    nextRotationRun,
    runRotation,
    errorResponse,
  } = ctx;

  app.get('/api/profiles', (req, res) => {
    try {
      res.json({ ok: true, profiles: loadProfilesData().profiles || [] });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/profiles', (req, res) => {
    try {
      const profile = createProfileSnapshot(String(req.body?.name || '').trim(), String(req.body?.notes || ''));
      res.json({ ok: true, profile });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/profiles/apply', (req, res) => {
    try {
      const result = applyProfileSnapshot(String(req.body?.id || ''), !!req.body?.reloadAfter);
      res.json({ ok: true, ...result });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.delete('/api/profiles', (req, res) => {
    try {
      const id = String(req.query.id || '');
      const data = loadProfilesData();
      data.profiles = (data.profiles || []).filter((profile) => profile.id !== id);
      saveProfilesData(data);
      const snapshotPath = path.join(PROFILE_STORE_DIR, `${id}.json`);
      if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
      appendActivity('profile_delete', { id });
      res.json({ ok: true });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/rotation', (req, res) => {
    try {
      res.json({ ok: true, rotation: loadRotation() });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.put('/api/rotation', (req, res) => {
    try {
      const next = { ...loadRotation(), ...req.body, nextRunAt: nextRotationRun(req.body || {}) };
      saveRotation(next);
      appendActivity('rotation_save', { enabled: !!next.enabled, everyMinutes: next.everyMinutes });
      res.json({ ok: true, rotation: next });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/rotation/run', (req, res) => {
    try {
      res.json({ ok: true, ...runRotation(!!req.body?.force) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });
}

module.exports = registerProfilesRoutes;
