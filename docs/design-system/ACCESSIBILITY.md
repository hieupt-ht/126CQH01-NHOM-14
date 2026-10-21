# Accessibility Rules

- Every input has a real label, a programmatic error message and a visible focus state.
- Icon-only controls have an accessible name; tooltip text is not the only label.
- Keyboard users can reach, operate and escape navigation, menus, dialogs and the mobile drawer.
- Modal dialogs trap focus while open and return it to the triggering control.
- Do not communicate state through color alone; pair status colors with text/icon and preserve semantic meaning.
- Check text/control contrast in the actual UI. Do not silently change the approved palette to compensate; adjust layout, size or hierarchy first.
- Long Vietnamese prompts wrap and remain readable; do not truncate the only copy of a user prompt.
- Respect `prefers-reduced-motion`; animation must not be required to understand state.
- Images have meaningful alternative text when informative and empty alternative text when decorative.
- Error messages identify an actionable next step without exposing stack traces, identifiers belonging to another user or secrets.
