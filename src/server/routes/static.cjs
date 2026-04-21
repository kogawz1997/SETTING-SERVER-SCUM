function registerStaticRoutes(app, ctx) {
  const { path, PUBLIC_DIR } = ctx;

  app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

module.exports = registerStaticRoutes;
