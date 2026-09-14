# Routes

## Static entry points

| URL / file | Source | Layout | Purpose |
| --- | --- | --- | --- |
| `/` | `index.html` | Multi-view desk application | Primary authoring application, including Stage Sketch. |
| `/stage.html` | generated from `index.html` | Stage Sketch only | Standalone stage-sketch distribution. Do not edit directly. |
| `/try.html` | `try.html` | Prototype variant | Experimental local view. |

## Target

The requested target is the Scene panel within the Stage Sketch portion of `/`. `index.html` is authoritative; `stage.html` is a generated artifact.
