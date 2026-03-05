// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { ChartStore } from '../chart-store.ts';
import type { ChartData } from '../types.ts';

describe('ChartStore', () => {
  function makeStore(data?: ChartData): ChartStore {
    const store = new ChartStore();
    if (data) store.data.value = data;
    return store;
  }

  const sampleData: ChartData = {
    series: [
      {
        name: 'Revenue',
        data: [
          { x: 'Jan', y: 100 },
          { x: 'Feb', y: 150 },
          { x: 'Mar', y: 200 },
        ],
      },
      {
        name: 'Costs',
        data: [
          { x: 'Jan', y: 80 },
          { x: 'Feb', y: 90 },
          { x: 'Mar', y: 100 },
        ],
      },
    ],
  };

  it('initializes with null data', () => {
    const store = makeStore();
    expect(store.data.value).toBeNull();
    expect(store.visibleSeries.value).toEqual([]);
  });

  it('computes visible series from data', () => {
    const store = makeStore(sampleData);
    expect(store.visibleSeries.value.length).toBe(2);
    expect(store.visibleSeries.value[0].name).toBe('Revenue');
  });

  it('toggleSeries hides and shows series', () => {
    const store = makeStore(sampleData);
    expect(store.visibleSeries.value.length).toBe(2);

    store.toggleSeries('Revenue');
    expect(store.visibleSeries.value.length).toBe(1);
    expect(store.visibleSeries.value[0].name).toBe('Costs');

    store.toggleSeries('Revenue');
    expect(store.visibleSeries.value.length).toBe(2);
  });

  it('computes color map', () => {
    const store = makeStore(sampleData);
    const colors = store.colorMap.value;
    expect(colors.size).toBe(2);
    expect(colors.has('Revenue')).toBe(true);
    expect(colors.has('Costs')).toBe(true);
  });

  it('respects custom series colors', () => {
    const data: ChartData = {
      series: [{ name: 'A', color: '#ff0000', data: [{ x: 0, y: 1 }] }],
    };
    const store = makeStore(data);
    expect(store.colorMap.value.get('A')).toBe('#ff0000');
  });

  it('detects band scale type from string x-values', () => {
    const store = makeStore(sampleData);
    expect(store.xScaleType.value).toBe('band');
  });

  it('detects linear scale type from number x-values', () => {
    const data: ChartData = {
      series: [{ name: 'A', data: [{ x: 0, y: 1 }, { x: 10, y: 5 }] }],
    };
    const store = makeStore(data);
    expect(store.xScaleType.value).toBe('linear');
  });

  it('detects time scale type from Date x-values', () => {
    const data: ChartData = {
      series: [{
        name: 'A',
        data: [
          { x: new Date('2024-01-01'), y: 1 },
          { x: new Date('2024-06-01'), y: 5 },
        ],
      }],
    };
    const store = makeStore(data);
    expect(store.xScaleType.value).toBe('time');
  });

  it('computes y domain from data', () => {
    const store = makeStore(sampleData);
    const [yMin, yMax] = store.yDomain.value;
    expect(yMin).toBe(0); // non-negative → extends to 0
    expect(yMax).toBeGreaterThan(200);
  });

  it('computes stacked y domain', () => {
    const store = makeStore(sampleData);
    store.stacked.value = true;
    const [_, yMax] = store.yDomain.value;
    // Max stacked value at Mar: 200+100 = 300 * 1.05 = 315
    expect(yMax).toBeCloseTo(315, 0);
  });

  it('resetView clears hidden series', () => {
    const store = makeStore(sampleData);
    store.toggleSeries('Revenue');
    expect(store.hiddenSeries.value.size).toBe(1);
    store.resetView();
    expect(store.hiddenSeries.value.size).toBe(0);
  });
});
