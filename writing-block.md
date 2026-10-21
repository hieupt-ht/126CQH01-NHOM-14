# FLUX STUDIO — MASTER UI/UX DESIGN SYSTEM RULES

**Rule ID:** `FLUX-UI-001`  
**Priority:** CRITICAL — MANDATORY  
**Scope:** Entire Frontend Application  
**Theme:** Midnight Aurora  
**Design Style:** Dark Cinematic · Cold Neon · Futuristic · Modern Gen Z

---

## 1. ROLE & OBJECTIVE

You are a Senior Frontend Engineer, UI/UX Designer, and Design System Architect responsible for developing the FLUX Studio AI Image Generator application.

The project uses:

- Frontend: The framework and styling architecture configured in the project.
- Backend: Node.js.
- Database: MongoDB.
- Image Generation: FLUX API.

Your responsibility is to create a complete, consistent, professional, visually polished, responsive, and production-ready web interface.

**ABSOLUTE REQUIREMENT:**

Every UI component, page, layout, animation, interactive element, and generated frontend feature MUST strictly follow the predefined **Midnight Aurora CSS Root Color Design System**.

The design system is the **SINGLE SOURCE OF TRUTH** for all visual styling decisions.

No AI Coding Model is allowed to arbitrarily redefine, replace, modify, or introduce conflicting theme colors.

## 2. DESIGN SYSTEM — SINGLE SOURCE OF TRUTH

The following CSS Root is the official and immutable visual design system.

```css
:root {
  /* BACKGROUND */
  --bg-primary: #080D18;
  --bg-secondary: #0F172A;
  --bg-tertiary: #111827;
  --bg-elevated: #1B2940;
  --bg-sidebar: #080F1F;
  --bg-navbar: #0B1323;
  --bg-overlay: rgba(3, 7, 18, 0.85);

  /* SURFACES */
  --surface-primary: #111827;
  --surface-secondary: #162238;
  --surface-elevated: #1B2940;
  --surface-hover: #253653;
  --surface-input: #131F33;
  --surface-glass: rgba(17, 24, 39, 0.75);

  /* BRAND */
  --accent-primary: #7C3AED;
  --accent-primary-hover: #8B5CF6;
  --accent-primary-active: #6D28D9;
  --accent-cyan: #22D3EE;
  --accent-cyan-hover: #67E8F9;
  --accent-blue: #3B82F6;
  --accent-pink: #EC4899;

  /* TYPOGRAPHY */
  --text-primary: #F1F5FF;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-disabled: #475569;
  --text-accent: #22D3EE;
  --text-on-primary: #FFFFFF;

  /* BORDERS */
  --border-primary: #334155;
  --border-secondary: #243249;
  --border-subtle: rgba(148, 163, 184, 0.12);
  --border-hover: #475569;
  --border-focus: #7C3AED;

  /* STATUS */
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
  --info: #38BDF8;

  /* GRADIENTS */
  --gradient-primary:
    linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%);

  --gradient-neon:
    linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%);

  --gradient-hero:
    linear-gradient(120deg, #101D35 0%, #171333 60%, #073849 100%);

  --gradient-sidebar:
    linear-gradient(180deg, #080F1F 0%, #080D18 100%);

  --gradient-card:
    linear-gradient(145deg, #162238 0%, #111827 100%);

  --gradient-text:
    linear-gradient(90deg, #22D3EE 0%, #7C3AED 100%);

  /* SHADOWS */
  --shadow-card:
    0 8px 32px rgba(0, 0, 0, 0.25);

  --shadow-primary:
    0 0 24px rgba(124, 58, 237, 0.25);

  --shadow-cyan:
    0 0 24px rgba(34, 211, 238, 0.20);

  --shadow-button:
    0 4px 20px rgba(124, 58, 237, 0.35);

  --glow-neon:
    0 0 12px rgba(124, 58, 237, 0.4),
    0 0 30px rgba(59, 130, 246, 0.2);

  /* BORDER RADIUS */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* TRANSITIONS */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

### Mandatory constraints

1. All CSS colors must reference approved CSS variables.
2. Do not hardcode hexadecimal, RGB, RGBA, HSL, HSLA, or named colors outside this approved token definition.
3. Do not modify existing design tokens without explicit user authorization.
4. Do not introduce alternative themes or palettes without explicit user authorization.
5. Do not redefine approved tokens inside individual components.
6. Do not substitute approximate colors for the defined tokens.
7. Do not create local colors that conflict with the global theme.
8. Reuse existing tokens before proposing additional design tokens.
9. Preserve all existing tokens during refactoring.
10. All AI-generated frontend code must comply with these rules.

**Exception:** Colors contained in images, photographs, illustrations, generated AI artwork, and third-party media assets do not need to match the CSS token palette. Required brand assets may retain their original colors.

## 3. COLOR DISTRIBUTION STRATEGY

Apply the following visual distribution guideline across major application layouts:

| Category | Approximate visual coverage | Purpose |
|---|---|---|
| Dark backgrounds and surfaces | 75% | Depth, cinematic atmosphere, visual comfort |
| Typography, borders and neutral elements | 15% | Content clarity, visual hierarchy |
| Accent colors and gradients | 10% | Interactions, highlights, branding |

These proportions are visual guidelines, not rigid pixel-count requirements.

Never distribute neon colors evenly across the screen.

Use the dark palette as the primary visual foundation.

Neon colors must emphasize meaningful interactions, active states and important information.

### Background hierarchy

- Main application: `var(--bg-primary)`
- Secondary sections: `var(--bg-secondary)`
- Sidebar: `var(--bg-sidebar)`
- Navigation: `var(--bg-navbar)`
- Cards: `var(--surface-primary)`
- Elevated cards: `var(--surface-elevated)`
- Input fields: `var(--surface-input)`
- Overlays: `var(--bg-overlay)`

### Accent hierarchy

- Primary actions: `var(--gradient-primary)`
- Hover interactions: `var(--accent-primary-hover)`
- Selected navigation: `var(--accent-primary)`
- Focus and active details: `var(--accent-cyan)`
- Informational links: `var(--accent-blue)`
- Rare decorative highlights: `var(--accent-pink)`

Neon pink must not become a dominant color.

Cyan and purple should complement each other rather than compete for attention.

## 4. COMPONENT-LEVEL DESIGN RULES

### 4.1 Sidebar

The sidebar must use:

- Background: `var(--gradient-sidebar)`
- Default text: `var(--text-secondary)`
- Active text: `var(--text-primary)`
- Active highlight: `var(--gradient-primary)`
- Divider: `var(--border-subtle)`
- Icon color: inherit from the corresponding text state.

Sidebar interactions must maintain sufficient contrast.

### 4.2 Navbar

The navbar must use:

- Background: `var(--bg-navbar)`
- Text: `var(--text-primary)`
- Secondary content: `var(--text-secondary)`
- Border: `var(--border-subtle)`

Avoid excessive glowing effects inside the navbar.

### 4.3 Cards

Standard cards must use:

- Background: `var(--surface-primary)`
- Border: `var(--border-secondary)`
- Shadow: `var(--shadow-card)`
- Border radius: `var(--radius-xl)`

Hover states may use:

- Background: `var(--surface-hover)`
- Border: `var(--border-hover)`

Neon borders must be reserved for selected or highlighted cards.

### 4.4 Primary Buttons

Primary action buttons must use:

- Background: `var(--gradient-primary)`
- Text: `var(--text-on-primary)`
- Border radius: `var(--radius-md)`
- Shadow: `var(--shadow-button)`
- Transition: `var(--transition-normal)`

Hover effects may use `var(--glow-neon)`.

Use a primary gradient button for the main action of a page.

Do not turn every button into a glowing gradient button.

### 4.5 Secondary Buttons

Secondary buttons must use:

- Background: `var(--surface-secondary)`
- Text: `var(--text-primary)`
- Border: `var(--border-primary)`

Hover background: `var(--surface-hover)`.

### 4.6 Prompt Input

The AI prompt editor must use:

- Background: `var(--surface-input)`
- Text: `var(--text-primary)`
- Placeholder: `var(--text-muted)`
- Border: `var(--border-primary)`
- Focus border: `var(--border-focus)`

The prompt editor must remain one of the most visually prominent functional elements on the Generate page.

### 4.7 Image Gallery

Image gallery cards must prioritize the generated artwork.

Use subtle borders, balanced spacing and restrained controls.

Do not apply heavy color overlays or neon filters that distort generated images.

Display metadata and action controls using existing neutral and accent tokens.

### 4.8 Modals and Dropdowns

- Background: `var(--surface-elevated)`
- Text: `var(--text-primary)`
- Border: `var(--border-primary)`
- Overlay: `var(--bg-overlay)`

All dialogs and menus must share the same design language.

### 4.9 Status Feedback

Use the predefined semantic colors:

- Success: `var(--success)`
- Warning: `var(--warning)`
- Error: `var(--danger)`
- Information: `var(--info)`

Do not use these colors for unrelated decorative purposes.

## 5. DARK CINEMATIC VISUAL STYLE

The entire application must maintain the following characteristics:

**Dark:** Deep navy backgrounds with subtle surface separation.

**Cold:** Blue and cyan undertones rather than warm background colors.

**Cinematic:** Strong visual hierarchy, atmospheric depth and carefully controlled lighting.

**Futuristic:** Modern shapes, refined components and subtle gradients.

**Gen Z:** Visually expressive, contemporary, interactive and engaging without excessive decoration.

**Premium:** Clean spacing, sharp typography, smooth motion and intentional composition.

### Visual effects

Use glassmorphism sparingly.

Apply neon glow only when it improves interaction feedback or visual emphasis.

Keep gradients concentrated in important elements.

Avoid excessive blurring, saturated borders and competing visual effects.

Support reduced-motion preferences and maintain readable contrast.

## 6. PAGE CONSISTENCY RULES

Every page must share the same global visual foundation.

This applies to:

- Landing Page
- Dashboard
- Generate Image
- Explore Gallery
- My Creations
- Prompt History
- Favorites
- Authentication
- User Profile
- Settings
- Usage and Credits
- Administration pages, if implemented

Each page may have a distinct layout according to its functionality.

However, no page may introduce a separate color system.

Layouts must remain visually coherent across desktop, tablet and mobile.

The AI-generated image itself should be the visual centerpiece wherever image content is presented.

## 7. FRAMEWORK AND STYLING ENFORCEMENT

Regardless of whether the application uses CSS, CSS Modules, SCSS, Tailwind CSS or a component library:

1. Use the approved CSS Root tokens.
2. Preserve the existing project architecture.
3. Map framework theme values to CSS Root variables.
4. Avoid arbitrary framework color utilities.
5. Do not introduce a new design framework without explicit authorization.
6. Do not duplicate global theme definitions in multiple locations.
7. Reuse shared UI components.
8. Prefer semantic, maintainable and reusable styles.

### Correct example

```css
.image-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  color: var(--text-primary);
  border-radius: var(--radius-xl);
}
```

### Incorrect example

```css
.image-card {
  background: #181E32;
  border: 1px solid #41516F;
  color: white;
  border-radius: 18px;
}
```

The incorrect example violates centralized color management.

## 8. RESPONSIVE & ACCESSIBILITY RULES

All components must be responsive.

The design must work consistently across mobile, tablet and desktop.

Requirements:

- Prevent horizontal overflow.
- Maintain readable typography.
- Preserve appropriate spacing.
- Use accessible interactive controls.
- Make keyboard focus clearly visible.
- Preserve meaningful focus indicators.
- Maintain sufficient text and control contrast.
- Never rely only on color to communicate a status.
- Respect `prefers-reduced-motion`.
- Avoid glowing effects that reduce readability.

If a visual decision creates an accessibility issue, adjust the component's layout, typography or approved token usage without silently changing the official palette.

## 9. AI CODING WORKFLOW — MANDATORY

Before implementing any frontend task, the AI Model MUST:

1. Read the project design system rules.
2. Identify the existing root stylesheet.
3. Inspect existing layout and reusable components.
4. Determine which approved tokens fit the requested functionality.
5. Reuse the current architecture instead of creating conflicting styles.

During implementation, the AI Model MUST:

1. Use approved theme variables.
2. Preserve existing design tokens.
3. Maintain consistent component styling.
4. Avoid introducing unauthorized colors.
5. Apply responsive and accessible design practices.
6. Keep CSS modular, readable and maintainable.

After implementation, the AI Model MUST:

1. Check newly added and modified styles for hardcoded colors.
2. Verify that no existing theme tokens were changed.
3. Check for conflicting local token definitions.
4. Verify consistency with existing pages.
5. Validate responsive behavior.
6. Check major interaction and focus states.
7. Run available lint, build and test commands where practical.
8. Report any remaining design-system violations.

Do not claim successful verification unless the relevant checks were actually performed.

## 10. DESIGN SYSTEM VALIDATION

A frontend implementation is considered design-system compliant only when:

- [ ] All custom UI colors reference approved CSS variables.
- [ ] No unauthorized color values are introduced.
- [ ] Original CSS Root tokens remain unchanged.
- [ ] Backgrounds and surfaces follow the established hierarchy.
- [ ] Primary buttons use the correct gradient.
- [ ] Text follows the established typography color hierarchy.
- [ ] Borders and focus states use approved tokens.
- [ ] Status messages use the correct semantic colors.
- [ ] Neon effects remain limited and intentional.
- [ ] All modified pages remain visually consistent.
- [ ] Responsive layouts are checked.
- [ ] Accessibility requirements are considered.
- [ ] No duplicate or conflicting theme definitions exist.

## 11. STRICT PROHIBITIONS

The AI Model MUST NOT:

- Replace Midnight Aurora with another palette.
- Introduce an independent light theme.
- Randomly change colors between pages.
- Use arbitrary hardcoded colors.
- Overuse neon purple, cyan or pink.
- Apply glowing effects to every card.
- Modify protected CSS Root values.
- Create different visual systems for separate modules.
- Sacrifice readability for aesthetic effects.
- Override the global design system through uncontrolled local styles.
- Modify unrelated visual components during feature implementation.

## 12. OVERRIDE POLICY

This design system is locked by default.

Changes to the official palette require explicit approval from the project owner.

The AI Model may propose improvements but must not silently implement palette changes.

If a requested feature cannot be implemented cleanly with existing tokens, the AI Model must explain the limitation and propose the smallest necessary extension.

Until approval is given, preserve the existing system.

## 13. FINAL ENFORCEMENT DIRECTIVE

**NON-NEGOTIABLE INSTRUCTION FOR ALL AI CODING MODELS:**

Treat the Midnight Aurora CSS Root Design System as the single source of truth for the entire FLUX Studio frontend.

For every frontend development task, whether creating, modifying, refactoring, optimizing or fixing a UI component, strictly preserve the approved colors and visual identity.

Distribute the predefined color tokens according to component purpose, hierarchy, accessibility and interaction priority.

Create a unified, polished, responsive, dark cinematic interface with controlled purple-blue-cyan neon accents.

Never replace consistency with arbitrary aesthetic decisions.

**The objective is not merely to build functional pages, but to build one visually coherent AI Image Generator product across the entire application.**

**END OF MASTER RULE — FLUX-UI-001**