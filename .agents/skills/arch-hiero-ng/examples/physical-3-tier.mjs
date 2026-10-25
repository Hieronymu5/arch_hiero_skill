// Physical diagram: a 3-tier web application (HTTP reverse proxy, Spring Boot, MySQL) with
// failover across two data centers, H-EAST and H-WEST, each its own network.
//
// Layout: one column per data center, every figure in it at the same x, so each arrow runs
// straight down. Figures are 120 x 100, so a column at element x = X has its centre at X + 60.
//   H-EAST network at x 40, 600 wide:   centre 340, figures at x 280
//   H-WEST network at x 760, 600 wide:  centre 1060, figures at x 1000
// Each zone is 320 tall, enough for two figures stacked 160 apart with an arrow between.
export default async ({ call, save }) => {
  const diagram = await call('create_diagram', {
    type: 'physical',
    name: '3-Tier Web Application',
    description:
      'Apache HTTP reverse proxies, a Spring Boot back end, and MySQL, with failover across ' +
      'the H-EAST and H-WEST data centers.',
  });
  const diagramId = diagram.id;
  const byLabel = (label) => diagram.elements.find((e) => e.label === label);

  // A new physical diagram has an End User zone and an Intranet network of three zones.
  await call('rename_element', { diagramId, elementId: byLabel('Intranet').id, label: 'H-EAST' });
  for (const zone of ['Perimeter', 'Business', 'Restricted']) {
    await call('resize_element', { diagramId, elementId: byLabel(zone).id, height: 320 });
  }
  // A second network copies the first one's zones, sizes included. The End User zone widens
  // to span both networks by itself.
  await call('add_element', { diagramId, kind: 'network', label: 'H-WEST', x: 760, y: 280 });

  const { elements } = await call('get_diagram', { diagramId });
  const zoneOf = (network, label) => {
    const networkId = elements.find((e) => e.label === network).id;
    return elements.find((e) => e.parentId === networkId && e.label === label).id;
  };
  const add = (kind, label, parentId, x, y, properties) =>
    call('add_element', { diagramId, kind, label, parentId, x, y, properties });
  const arrow = (source, target, protocol, port) =>
    call('add_arrow', { diagramId, sourceId: source.id, targetId: target.id, protocol, port });

  // Between the two networks, above them. Its two arrows can't both be straight.
  const customer = await add('user', 'Customer', byLabel('End User').id, 640, 80);

  const tiers = {};
  for (const [dc, x] of [
    ['H-EAST', 280],
    ['H-WEST', 1000],
  ]) {
    const perimeter = zoneOf(dc, 'Perimeter');
    const business = zoneOf(dc, 'Business');
    const restricted = zoneOf(dc, 'Restricted');
    const vm = { serverType: 'virtual-machine' };
    const mysql = { databaseType: 'mysql' };
    const primary = dc === 'H-EAST' ? 'MySQL Primary' : 'MySQL Standby';
    tiers[dc] = {
      webLb: await add('load-balancer', 'Web Load Balancer', perimeter, x, 340),
      // instanceCount draws one figure with "×2" beside it, rather than two figures.
      proxy: await add('server', 'HTTPD Proxy', perimeter, x, 500, { ...vm, instanceCount: 2 }),
      appLb: await add('load-balancer', 'App Load Balancer', business, x, 660),
      app: await add('server', 'Spring Boot', business, x, 820, { ...vm, instanceCount: 4 }),
      // Two separate database figures, not one with "×2": the cross-site replication arrow runs
      // sideways from the primary, and would cross a "×2" badge beside it.
      db: await add('database', primary, restricted, x, 1000, mysql),
      replica: await add('database', 'MySQL Replica', restricted, x, 1140, mysql),
    };
  }

  for (const t of Object.values(tiers)) {
    await arrow(customer, t.webLb, 'HTTPS', '443');
    await arrow(t.webLb, t.proxy, 'HTTPS', '443');
    await arrow(t.proxy, t.appLb, 'HTTP', '8080');
    await arrow(t.appLb, t.app, 'HTTP', '8080');
    await arrow(t.app, t.db, 'JDBC', '3306');
    await arrow(t.db, t.replica, 'Replication', '3306');
  }
  // The primaries sit at the same y, so this runs straight across between the networks.
  await arrow(tiers['H-EAST'].db, tiers['H-WEST'].db, 'Replication', '3306');

  await save(diagramId, 'physical-3-tier-web-app');
};
