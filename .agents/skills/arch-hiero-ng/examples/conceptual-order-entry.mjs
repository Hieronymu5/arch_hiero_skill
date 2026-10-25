// Conceptual diagram: a user places an order in Order Entry through the web; Order Entry calls
// Inventory's API; a job pulls orders from Order Entry's database into the Prometheus data lake.
//
// Layout, top to bottom: the user and downstream systems, which take Order Entry's data (the
// job and Prometheus); the central application (Order Entry); then upstream systems, which it
// gets data from (Inventory).
//
// Arrows run straight in the middle of where their elements' facing sides overlap, so each
// element only needs to sit over or under Order Entry (x 40, 420 wide: 40–460):
//   the actor (120 wide) at x 40, centre 100
//   Prometheus (200 wide) at x 260, the job (160 wide) at x 280, and the database inside Order
//   Entry (120 wide) at x 300 share the centre x 360. That keeps the job's arrow to the
//   database clear of Order Entry's name and description, centred at x 250 in its header.
//   Inventory (200 wide) at x 140, centre 240, under Order Entry.
export default async ({ call, save }) => {
  const { id: diagramId } = await call('create_diagram', {
    type: 'conceptual',
    name: 'Order Entry',
    description:
      'A user places an order through the web; Order Entry checks stock with Inventory, and a ' +
      'job copies orders into the Prometheus data lake.',
  });
  const add = (kind, label, x, y, more = {}) =>
    call('add_element', { diagramId, kind, label, x, y, ...more });
  const arrow = (source, target, details) =>
    call('add_arrow', { diagramId, sourceId: source.id, targetId: target.id, ...details });

  const orderEntry = await add('application', 'Order Entry', 40, 360, {
    description: 'Takes orders from users',
  });
  // Tall enough for its header (60) and the database figure (80) with padding.
  await call('resize_element', { diagramId, elementId: orderEntry.id, width: 420, height: 180 });

  const user = await add('actor', 'User', 40, 40);
  const prometheus = await add('application', 'Prometheus', 260, 40, { description: 'Data lake' });
  const job = await add('job', 'Data Lake Extract', 280, 220);
  // A component drawn as a database cylinder (120 × 80), below Order Entry's header.
  const ordersDb = await add('component', 'Orders DB', 300, 440, {
    parentId: orderEntry.id,
    properties: { componentType: 'database' },
  });
  const inventory = await add('application', 'Inventory', 140, 620, {
    description: 'Tracks stock levels',
  });

  // connector names the interface the arrow reaches; manual (dashed) means a person does it.
  await arrow(user, orderEntry, { label: 'Place order', mode: 'manual', connector: 'Web' });
  await arrow(orderEntry, inventory, { label: 'Check stock', connector: 'REST API' });
  // The job pulls data: the arrow points from the job to the database, and data comes back.
  await arrow(job, ordersDb, { label: 'Pull orders', bidirectional: true, connector: 'JDBC' });
  await arrow(job, prometheus, { label: 'Load orders', connector: 'Ingest API' });

  await save(diagramId, 'conceptual-order-entry');
};
