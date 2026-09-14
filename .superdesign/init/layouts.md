# Layouts

## Application shell

- Source: `index.html`
- Description: A multi-view, framework-free app. The `#view-stage` stage-sketch view is embedded in the document and uses an asymmetric multi-column desk/stage layout.
- Shared layout components: none as separate source files.

## Stage Sketch editor shell

- Source: `index.html:580-700`
- Description: The central stage column contains the Scene panel, a centre toolbar, scene-navigation strip, and stage canvases. The Scene panel is a narrow contextual work panel rather than a standalone page.

## Target panel

- Source: `index.html:591-636`
- Description: The Scene panel currently places transition controls above a list and repositions a six-button action group below the selected row. The redesign should preserve this panel's role inside the editor shell and must not turn it into a generic dashboard card.
