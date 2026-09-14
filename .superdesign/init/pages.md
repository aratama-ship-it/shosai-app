# Pages and dependency trees

## / — Stage Sketch Scene panel

Entry: `index.html:591-636`

Dependencies:

- `style.css`
  - `:root` tokens at `1-74`
  - transition controls at `7493-7539`
  - compact scene-action group at `8983-9024`
- `stage-sketch.js`
  - scene row render and action relocation at `15190-15385`
  - hierarchy movement at `14968-15008`
  - range-to-section flow at `15092-15134`
- `stage-i18n.js`
  - localised labels used by `stage-sketch.js`

The scene panel is an existing rendered target. It is not a separate route and should retain the app's dark desk visual language.
