---
name: arch-hiero-ng
description: Build architecture diagrams in ArchHiero (https://arch-hiero.vercel.app/) through its WebMCP tools and export them as SVG, draw.io, and PNG. Use when the user asks for a conceptual, physical, or deployed component diagram made with ArchHiero, or to render, lay out, or tidy one.
argument-hint: "[the diagram to build, and where to save it]"
---

# ArchHiero diagrams

ArchHiero draws three types of architecture diagram in the browser and offers tools to AI agents through [WebMCP](https://github.com/webmachinelearning/webmcp). You build a diagram by calling those tools, check how it came out, fix it, and export it.

| Type | Shows | Arrows |
| --- | --- | --- |
| `conceptual` | Actors, applications, the components, processes, and data in them, and jobs | Labelled, with a connector (interface), manual or automated, one- or two-way |
| `physical` | Users, servers, databases, load balancers, firewalls, gateways, and storage in zones and networks | Protocol and port |
| `deployed-component` | Components in layers, such as network zones, with protocols and tech stacks | None |

## 1. Choose how to call the tools

- **Playwright MCP tools named `webmcp_*`**, such as `webmcp_create_diagram`: open the app's URL and call them directly. Each call shows you its result, so build step by step.
- **Otherwise**, use `scripts/hiero.mjs`. It opens the app in a headless browser, runs a script of tool calls, and saves the diagram as SVG, draw.io, and PNG:

  ```bash
  npm install --prefix <skill>/scripts          # once
  node <skill>/scripts/hiero.mjs my-diagram.mjs --out <folder>
  ```

  `my-diagram.mjs` default-exports `async ({ call, save }) => { … }`. `call(tool, input)` runs a tool and returns its result. `save(diagramId, name)` writes `<name>.svg`, `.drawio`, and `.png`, then lists any arrow that isn't straight and any text that's cut off. Pass `--url` to use another copy of the app, such as `http://localhost:4200/`. Without Google Chrome, also run `npx --prefix <skill>/scripts playwright install chromium`.

  Each run starts with no diagrams, so build the whole diagram in one script, and rerun it after each fix. Start from the example closest to what you're building, in `examples/`.

Diagrams are stored in that browser profile. The files you export are what the user gets.

## 2. Plan the layout before adding anything

1. Call `create_diagram`. It returns what `get_diagram` does, including each kind of element, with its usual `size`, what it `canContain`, what it has `arrowsTo`, and its `properties`. Read it rather than guessing.
2. Sketch the diagram as rows and columns, and work out each element's `x` and `y`. Positions are the element's top-left corner, in pixels, snapped to a 20-pixel grid, or to 10 pixels in a physical diagram.
3. Line elements up so arrows run straight (see below).

### How arrows attach

An arrow joins the sides of its two elements that face each other. It runs straight in the middle of where those sides overlap, or as near the middle as keeps it 40 pixels from other straight arrows on the same side. When the sides don't overlap, or there's no room, it goes direct, between points spread evenly along the sides.

- **Same-width figures in a column:** give them the same `x`, and the arrow runs down the middle of both.
- **Several elements above a wide one**, such as a user and a dependency above an application: put them side by side over the wide element, with their centres at least 40 pixels apart. Each arrow runs straight down from the middle of its element. Make the wide element only as wide as the elements above or below it span.
- **When the sides don't overlap**, the arrow goes direct. Move one element so they overlap.
- **`add_arrow` with `straight: true`** pins the arrow in the middle of the overlap, even close to another arrow. You rarely need it. It fails if the sides don't overlap.
- **A user reaching several elements:** on a conceptual diagram, draw the actor again, with the same name, above each application it uses, so every arrow runs straight down. On a physical diagram, such as one user reaching two data centres, not every arrow can be straight, so centre the user between them.

## 3. Build

- **`add_element`** with `parentId` and `x`/`y` puts the element at that spot inside the container. An element placed in a container is kept inside its current bounds, so resize the container first to make room.
- **`add_element`** with only `x`/`y` puts the element in whichever container its centre lands on. Prefer giving `parentId`.
- **`resize_element`** resizes containers, and applications and other resizable kinds, from the bottom-right corner. It returns the size the element ended up.
- **`move_element`**, **`update_element`**, **`delete_arrow`**, **`rename_element`**, and **`delete_element`** fix things without starting over.

Every element result includes its drawn `x`, `y`, `width`, `height`, `parentLabel`, and any `clippedText`. Every arrow result includes its drawn `from` and `to` points and whether it's `straight`.

## 4. Check, fix, and export

1. **Cut-off text:** `clippedText` lists text that's cut off on the canvas or in the exports. Shorten the name, such as "HTTPD Proxy" rather than "Apache HTTP Reverse Proxy", or split a description into short lines. Physical figure names get two lines of about 12 characters each.
2. **Bent arrows:** for each arrow whose `straight` is `false`, move an element so its sides overlap the other's, or apart from the arrows next to it, unless it can't be straight (see above).
3. **Look at it:** export it with `export_diagram` (`download: false` returns the contents), or with `save` in the script, and look at the PNG. Check that labels and arrows don't overlap, such as a horizontal arrow running through a "×2" instance badge, which sits to the right of a figure.
4. **Save:** save the SVG, draw.io, and PNG files where the user asked, named after the diagram, such as `physical-3-tier-web-app.svg`. Say which arrows aren't straight and why.

## Conventions by diagram type

### Conceptual

- Put actors and downstream systems (those that take the central application's data, such as a data lake fed by an extract job) on top, the central application in the middle, and upstream systems (those it gets data from, such as an inventory API it calls) below.
- When one actor uses several applications, such as a user who asks Claude Code for a diagram and then views it in ArchHiero, add a separate `actor` with the same `label` above each application rather than one actor with angled arrows to all of them.
- Lay out the story left to right in the order things happen, where there's an order. Put the applications in a flow side by side, the first one on the left. In a row of elements above or below an application, put what happens first on the left, such as the user entering a request to the left of the data lake the application later exports that request to.
- Make the central application only as wide as the dependencies above or below it span, and run arrows vertically.
- Put what's inside an application, such as its database, inside it with `parentId`: components, processes, entities, and files. A `component` with `componentType: "database"` is drawn as a cylinder, 120 × 80. A `file` is data kept as a file, such as an export or a CSV: a page with a folded corner, 120 × 80, in the data colour. Processes, entities, and files take arrows from actors, applications, components, jobs, and processes; entities and files don't start them. An application's header, with its name and description, is 60 tall. An arrow from above to something inside an application crosses the header, whose text is centred, so put that thing to one side, such as the right third of the application.
- Give each arrow to an application its interface as `connector`, such as `Web`, `REST API`, or `JDBC`, and a short `label`.
- Use `mode: "manual"` (dashed) for something a person does, and `bidirectional: true` when data comes back, such as a job pulling data.
- Use a `job` for scheduled work, such as an extract. It can have arrows to applications, components, processes, entities, and files.

### Physical

- A new diagram has an **End User** zone at the top and an **Intranet** network with **Perimeter**, **Business**, and **Restricted** zones stacked in it. Rename the network for a data centre, and add a `network` beside it for each other one. A new network copies the existing one's zones and their sizes. The End User zone widens to span the networks.
- Zones stack top to bottom in their network and span its width; you can only change their height. A zone 200 tall holds one row of figures. Make it 320 tall to stack two, such as a load balancer above the servers behind it.
- Figures are 120 × 100. Give a tier's figures the same `x` for vertical arrows.
- Positions snap to 10 pixels, so a figure can sit centred over two others, such as a load balancer at `x` 210 over servers at `x` 140 and 280.
- Use `instanceCount` for a cluster of identical servers, which draws one figure with "×4" beside it. Use separate figures when the copies play different roles, such as a primary and a replica.
- `serverType` is `physical`, `virtual-machine`, or `container`. `databaseType` sets the database's logo and its arrows' usual port.
- Give arrows a `protocol` and `port`, such as `HTTPS` and `443`.

### Deployed component

- Add layers in order from top to bottom, such as End User, Perimeter, Business, and Restricted zones. Their `characteristics`, such as "Internet facing" or "Behind firewall", are drawn across their top.
- Add components to a layer with `parentId`, in order from left to right. Layers and components size themselves, so positions and `resize_element` don't apply.
- Each line of a component's description is a one-line bullet, so keep lines short and use several.
- `dependency` is `system` (green, the default), `internal` (yellow), or `external` (red, such as a third-party identity provider).
- `protocols` are drawn across the top of a component, and `techStack` as logos along the bottom. The `techStack` ids, such as `springboot`, `angular`, and `mysql`, are in the `add_element` tool's input schema.
