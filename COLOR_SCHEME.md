# BEEHIVE Color Scheme

## Brand Colors

### Logo Colors

| Color Name | Hex Code | Usage in Logo |
|------------|----------|---------------|
| **Golden Yellow** | `#F9C900` | Main circular beehive background |
| **Deep Black** | `#000000` | Text, outlines, and central banner strip |
| **Honey Orange/Amber** | `#FF9A00` | The dripping honey element |
| **Mid-Tone Yellow** | `#E5AD3A` | Subtle highlights within the honeycomb pattern and the "Est. 2023" background |

## System Component Colors

| System Component | Recommended Color | Hex Code | Rationale |
|------------------|-------------------|----------|-----------|
| **Primary Action Button** | Golden Yellow | `#F9C900` | High visibility and energetic; encourages action |
| **Backgrounds (Light)** | White / Off-white | `#FFFFFF` | Best for readability and less eye strain, especially for a POS/Dashboard |
| **Text/Headings** | Deep Black / Dark Grey | `#000000` / `#333333` | Professional and ensures maximum contrast |
| **Accent/Highlight** | Honey Orange/Amber | `#FF9A00` | Draws attention without overwhelming the main action color (Sales badges, Notifications) |
| **Subtle Background Pattern** | Mid-Tone Yellow | `#E5AD3A` | Can be used subtly for section headers or decorative elements to add depth (Landing Page Only) |

## Color Palette

```css
/* Primary Colors */
--golden-yellow: #F9C900;
--deep-black: #000000;
--honey-orange: #FF9A00;
--mid-tone-yellow: #E5AD3A;

/* Neutral Colors */
--white: #FFFFFF;
--dark-grey: #333333;
--light-grey: #F5F5F5;
```

## Usage Guidelines

### Primary Actions
- Use **Golden Yellow (#F9C900)** for primary buttons like "Checkout", "Order Now", "Add to Cart"
- Pair with Deep Black (#000000) text for maximum contrast

### Backgrounds
- Use **White (#FFFFFF)** for main content areas
- Use **Light Off-white (#F5F5F5)** for subtle section separation
- Use **Mid-Tone Yellow (#E5AD3A)** sparingly for decorative elements on landing page only

### Accents & Notifications
- Use **Honey Orange (#FF9A00)** for:
  - Sales badges
  - Notifications
  - Alert messages
  - Special offers
  - Hover states for secondary actions

### Text & Typography
- **Primary Text**: Deep Black (#000000)
- **Secondary Text**: Dark Grey (#333333)
- **Light Text on Dark Backgrounds**: White (#FFFFFF)

## Accessibility

### Contrast Ratios
- ✅ Golden Yellow (#F9C900) on Deep Black (#000000): High contrast
- ✅ Deep Black (#000000) on White (#FFFFFF): Maximum contrast (21:1)
- ✅ Honey Orange (#FF9A00) on White (#FFFFFF): Good contrast
- ⚠️ Mid-Tone Yellow (#E5AD3A) on White (#FFFFFF): Use for decorative elements only, not text

### Best Practices
1. Always use Deep Black or Dark Grey for body text
2. Ensure buttons have sufficient contrast with their backgrounds
3. Use Golden Yellow sparingly to maintain its impact
4. Test color combinations with accessibility tools

## Component Examples

### Button Styles
```tsx
// Primary Button
background: #F9C900 (Golden Yellow)
text: #000000 (Deep Black)
hover: #E5AD3A (Mid-Tone Yellow)

// Secondary Button
background: transparent
border: #F9C900 (Golden Yellow)
text: #F9C900 (Golden Yellow)
hover background: #F9C900
hover text: #000000

// Accent Button
background: #FF9A00 (Honey Orange)
text: #FFFFFF (White)
hover: darken(#FF9A00, 10%)
```

### Card Styles
```tsx
// Default Card
background: #FFFFFF
border: #E5E5E5
shadow: subtle

// Highlighted Card
background: #FFFBF0 (very light golden yellow)
border: #F9C900
shadow: medium with golden tint
```

### Alert/Badge Styles
```tsx
// Success
background: #4CAF50
text: #FFFFFF

// Warning
background: #FF9A00 (Honey Orange)
text: #FFFFFF

// Error
background: #F44336
text: #FFFFFF

// Info
background: #F9C900 (Golden Yellow)
text: #000000
```

## Integration with Tailwind CSS

Add these to your `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'beehive-yellow': '#F9C900',
        'beehive-orange': '#FF9A00',
        'beehive-gold': '#E5AD3A',
        'beehive-black': '#000000',
        'beehive-grey': '#333333',
      }
    }
  }
}
```

Usage:
```tsx
<button className="bg-beehive-yellow text-beehive-black">Order Now</button>
<div className="bg-beehive-orange text-white">Sale!</div>
```
