# @nonoun/native-chart

SVG charting components for `@nonoun/native-ui`.

## Install

```bash
npm install @nonoun/native-chart
```

Peer dependency: `@nonoun/native-ui >= 0.7.0`.

## Usage

```html
<link rel="stylesheet" href="@nonoun/native-chart/css" />
<script type="module">
  import '@nonoun/native-chart/register';
</script>

<n-chart type="line" palette="vivid" legend="bottom" grid="horizontal" animate></n-chart>

<script>
  document.querySelector('n-chart').data = {
    labels: ['Jan', 'Feb', 'Mar'],
    series: [
      { name: 'Revenue', data: [{ x: 'Jan', y: 100 }, { x: 'Feb', y: 140 }, { x: 'Mar', y: 120 }] },
    ],
  };
</script>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `'line' \| 'bar' \| 'scatter' \| 'sparkline'` | `'line'` | Chart type |
| `src` | `string` | — | URL to fetch JSON data from |
| `palette` | `'default' \| 'vivid' \| 'pastel' \| 'earth' \| 'ocean' \| 'sunset' \| 'forest' \| 'neon' \| 'mono' \| 'accessible'` | `'default'` | Color palette |
| `stacked` | boolean | `false` | Stack series |
| `smooth` | boolean | `false` | Smooth line interpolation |
| `area` | boolean | `false` | Fill area under lines |
| `horizontal` | boolean | `false` | Horizontal orientation |
| `legend` | `'top' \| 'bottom' \| 'none'` | `'bottom'` | Legend position |
| `grid` | `'horizontal' \| 'vertical' \| 'both' \| 'none'` | `'horizontal'` | Grid lines |
| `animate` | boolean | `true` | Animate on render |
| `aspect` | `string` | — | Aspect ratio (e.g. `16:9`) |
| `x-label` | `string` | — | X-axis label |
| `y-label` | `string` | — | Y-axis label |
| `average` | boolean | `false` | Show average reference line |
| `disabled` | boolean | `false` | Disable pointer interactions |

## JS-Only Properties (Intentional Exceptions)

The following properties are JS-only by design — they accept complex nested data structures that cannot round-trip through HTML attributes. Per the Attribute Principle, this is the documented exception for "complex objects that genuinely cannot be serialized."

| Property | Type | Why JS-only |
|----------|------|-------------|
| `data` | `ChartData` | Object with `labels?: string[]` and `series: ChartSeries[]` — each series contains an array of `{ x, y, r?, label? }` points. Not practically serializable to an attribute. |
| `referenceLines` | `ReferenceLine[]` | Array of `{ axis, value, label?, color?, style? }` config objects — same reason. |

Set these via JavaScript:

```js
const chart = document.querySelector('n-chart');

chart.data = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Sales', data: [{ x: 'Q1', y: 200 }, { x: 'Q2', y: 350 }, { x: 'Q3', y: 280 }, { x: 'Q4', y: 410 }] },
  ],
};

chart.referenceLines = [
  { axis: 'y', value: 300, label: 'Target', style: 'dashed' },
];
```

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `native:chart-hover` | `{ point, series, x, y }` | Pointer near a data point |
| `native:chart-select` | `{ point, series }` | Click on a data point |
| `native:chart-legend-toggle` | `{ series, visible }` | Legend item toggled |
