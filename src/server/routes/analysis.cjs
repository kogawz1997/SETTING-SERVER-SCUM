function registerAnalysisRoutes(app, ctx) {
  const {
    scanLootWorkspace,
    analyzeOverview,
    buildGraph,
    buildGraphRefEditPlan,
    searchWorkspace,
    resolvedPaths,
    errorResponse,
  } = ctx;

  app.get('/api/analyzer/overview', (req, res) => {
    try {
      res.json({ ok: true, overview: analyzeOverview(scanLootWorkspace()) });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.get('/api/graph', (req, res) => {
    try {
      res.json({ ok: true, ...buildGraph(scanLootWorkspace(), req.query.focus || '') });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/graph/edit-ref', (req, res) => {
    try {
      const result = buildGraphRefEditPlan(req.body || {});
      res.json({ ok: true, ...result });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/search', (req, res) => {
    try {
      res.json({
        ok: true,
        results: searchWorkspace(req.query.term || '', resolvedPaths(), {
          scope: req.query.scope,
          match: req.query.match,
          issue: req.query.issue,
        }),
      });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });
}

module.exports = registerAnalysisRoutes;
