// Deployed component diagram: where each component of a web application runs, by network zone.
//
// Layers stack top to bottom in the order they're added, and components sit side by side in
// their layer in the order they're added. Both size themselves, so there are no positions or
// sizes to give.
export default async ({ call, save }) => {
  const { id: diagramId } = await call('create_diagram', {
    type: 'deployed-component',
    name: 'Web Application Deployment',
    description: 'Where each component of the web application is deployed, by network zone.',
  });
  // characteristics are drawn in a bar across the top of the layer.
  const layer = (label, characteristics) =>
    call('add_element', { diagramId, kind: 'layer', label, properties: { characteristics } });
  // Each line of a description is a bullet of one line, cut off with "…" when it's too long,
  // so keep lines short.
  const component = (parent, label, lines, properties) =>
    call('add_element', {
      diagramId,
      kind: 'component',
      parentId: parent.id,
      label,
      description: lines.join('\n'),
      properties,
    });

  const endUser = await layer('End User Zone', ['Untrusted', 'Internet']);
  const perimeter = await layer('Perimeter Zone', ['Internet facing', 'Behind firewall']);
  const business = await layer('Business Zone', ['Internal']);
  const restricted = await layer('Restricted Zone', ['Internal', 'Sensitive data']);

  // protocols are drawn in a bar across the top, and techStack as logos along the bottom.
  await component(endUser, 'Angular SPA', ['Runs in the user’s browser'], {
    protocols: ['HTTPS'],
    techStack: ['angular', 'typescript', 'chrome'],
  });
  await component(
    perimeter,
    'Angular Web Front End',
    ['Angular bundle', 'On an Apache HTTP Server', 'Reached by DNS name'],
    { protocols: ['HTTPS', 'DNS'], techStack: ['angular', 'apache-http', 'linux'] },
  );
  await component(business, 'Spring Boot Service', ['Business logic', 'REST API'], {
    protocols: ['REST', 'JWT'],
    techStack: ['springboot', 'java', 'linux'],
  });
  // A third-party service is an external dependency, drawn red.
  await component(business, 'Okta IDP', ['Third-party Okta service', 'Sign-in and tokens'], {
    dependency: 'external',
    protocols: ['OIDC', 'SAML'],
  });
  await component(restricted, 'MySQL Database', ['Application data'], {
    protocols: ['JDBC'],
    techStack: ['mysql', 'linux'],
  });

  await save(diagramId, 'deployed-component-web-app');
};
