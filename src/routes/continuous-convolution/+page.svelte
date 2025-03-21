<script lang="ts">
  import * as d3 from 'd3';
  import Plot from '$lib/Plot.svelte';
  import {
    type PlottableFunction,
    Rect,
    Tri,
    CausalExp,
    FunctionProduct,
  } from '$lib/plottable-functions';

  class ShiftedFlippedFunction implements PlottableFunction {
    shift = 0;
    private func: PlottableFunction;
    constructor(func: PlottableFunction, shift: number = 0) {
      this.shift = shift;
      this.func = func;
    }
    getPlotData(range: [number, number]): [number, number][] {
      return [
        [range[0], this.func.eval(this.shift - range[0])],
        ...this.func
          .getPlotData([this.shift - range[1], this.shift - range[0]])
          .map(([x, y]) => [this.shift - x, y] as [number, number])
          .reverse()
          .filter(([x]) => range[0] <= x && x <= range[1]),
        [range[1], this.func.eval(this.shift - range[1])],
      ];
    }
    eval(x: number) {
      return this.func.eval(this.shift - x);
    }
  }

  class RectTriConv implements PlottableFunction {
    shift = 0;
    scale = 1;
    constructor(options: { shift?: number; scale?: number } = {}) {
      this.shift = options?.shift ?? 0;
      this.scale = options?.scale ?? 1;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const l = this.shift - 1.5 * this.scale;
      const r = this.shift + 1.5 * this.scale;
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (
        let x = Math.max(l, range[0]);
        x <= Math.min(r, range[1]);
        x += this.scale / 30
      ) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      x = (x - this.shift) / this.scale;
      return x < -1.5
        ? 0
        : x < -0.5
          ? 0.5 * Math.pow(x + 1.5, 2)
          : x < 0.5
            ? 0.75 - x * x
            : x < 1.5
              ? 0.5 * Math.pow(1.5 - x, 2)
              : 0;
    }
  }

  class RectExpConv implements PlottableFunction {
    shift = 0;
    scale = 1;
    constructor(options: { shift?: number; scale?: number } = {}) {
      this.shift = options?.shift ?? 0;
      this.scale = options?.scale ?? 1;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const l = this.shift - 0.5 * this.scale;
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (let x = Math.max(l, range[0]); x <= range[1]; x += this.scale / 30) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      x = (x - this.shift) / this.scale;
      return x < -0.5
        ? 0
        : x < 0.5
          ? 1 - Math.exp(-x - 1 / 2)
          : 2 * Math.sinh(1 / 2) * Math.exp(-x);
    }
  }

  class TriTriConv implements PlottableFunction {
    shift = 0;
    scale = 1;
    constructor(options: { shift?: number; scale?: number } = {}) {
      this.shift = options?.shift ?? 0;
      this.scale = options?.scale ?? 1;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const l = this.shift - 2 * this.scale;
      const r = this.shift + 2 * this.scale;
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (
        let x = Math.max(l, range[0]);
        x <= Math.min(r, range[1]);
        x += this.scale / 30
      ) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      const tabs = Math.abs((x - this.shift) / this.scale);
      if (tabs < 1) {
        return 2 / 3 + ((1 / 2) * tabs - 1) * tabs * tabs;
      } else if (tabs < 2) {
        return Math.pow(2 - tabs, 3) / 6;
      } else {
        return 0;
      }
    }
  }

  class TriExpConv implements PlottableFunction {
    shift = 0;
    scale = 1;
    constructor(options: { shift?: number; scale?: number } = {}) {
      this.shift = options?.shift ?? 0;
      this.scale = options?.scale ?? 1;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const l = this.shift - 1 * this.scale;
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (let x = Math.max(l, range[0]); x <= range[1]; x += this.scale / 30) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      x = (x - this.shift) / this.scale;
      return x < -1
        ? 0
        : x < 0
          ? x + Math.exp(-x - 1)
          : x < 1
            ? (Math.exp(-1) - 2) * Math.exp(-x) + 2 - x
            : (Math.exp(-1) + Math.exp(1) - 2) * Math.exp(-x);
    }
  }

  class ExpExpConv implements PlottableFunction {
    shift = 0;
    scale = 1;
    constructor(options: { shift?: number; scale?: number } = {}) {
      this.shift = options?.shift ?? 0;
      this.scale = options?.scale ?? 1;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const l = this.shift;
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (let x = Math.max(l, range[0]); x <= range[1]; x += this.scale / 30) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      x = (x - this.shift) / this.scale;
      return x < 0 ? 0 : x * Math.exp(-x);
    }
  }

  const inputChoices = [
    {
      label: 'rect(t)',
      func: new Rect(),
      xlims: [-1, 1] as const,
    },
    {
      label: 'rect(t-½)',
      func: new Rect({ shift: 0.5 }),
      xlims: [-0.5, 1.5] as const,
    },
    {
      label: 'rect(t+½)',
      func: new Rect({ shift: -0.5 }),
      xlims: [-1.5, 0.5] as const,
    },
    {
      label: 'tri(t)',
      func: new Tri(),
      xlims: [-1.5, 1.5] as const,
    },
    {
      label: 'exp(-t)⋅ϵ(t)',
      func: new CausalExp(),
      xlims: [-0.5, 2.5] as const,
    },
  ];

  let uchoice = $state(inputChoices[0]);
  let hchoice = $state(inputChoices[0]);

  let y_xlims = $derived([
    uchoice.xlims[0] + hchoice.xlims[0],
    uchoice.xlims[1] + hchoice.xlims[1],
  ] as const);

  let t = $state(0);

  $effect(() => {
    if (t < y_xlims[0]) {
      t = y_xlims[0];
    }
    if (t > y_xlims[1]) {
      t = y_xlims[1];
    }
  });

  let shifted_h_func = $derived(new ShiftedFlippedFunction(hchoice.func, t));

  let y_func = $derived.by(() => {
    if (uchoice.func instanceof Rect) {
      if (hchoice.func instanceof Rect) {
        return new Tri({ shift: uchoice.func.shift + hchoice.func.shift });
      } else if (hchoice.func instanceof Tri) {
        return new RectTriConv({ shift: uchoice.func.shift + hchoice.func.shift });
      } else if (hchoice.func instanceof CausalExp) {
        return new RectExpConv({ shift: uchoice.func.shift + hchoice.func.shift });
      }
    } else if (uchoice.func instanceof Tri) {
      if (hchoice.func instanceof Rect) {
        return new RectTriConv({ shift: uchoice.func.shift + hchoice.func.shift });
      } else if (hchoice.func instanceof Tri) {
        return new TriTriConv({ shift: uchoice.func.shift + hchoice.func.shift });
      } else if (hchoice.func instanceof CausalExp) {
        return new TriExpConv({ shift: uchoice.func.shift + hchoice.func.shift });
      }
    } else if (uchoice.func instanceof CausalExp) {
      if (hchoice.func instanceof Rect) {
        return new RectExpConv({ shift: uchoice.func.shift + hchoice.func.shift });
      } else if (hchoice.func instanceof Tri) {
        return new TriExpConv({ shift: uchoice.func.shift + hchoice.func.shift });
      } else if (hchoice.func instanceof CausalExp) {
        return new ExpExpConv({ shift: uchoice.func.shift + hchoice.func.shift });
      }
    }
    throw new Error();
  });
</script>

{#snippet plotpath(
  xscale: d3.ScaleContinuousNumeric<number, number, never>,
  yscale: d3.ScaleContinuousNumeric<number, number, never>,
  func: PlottableFunction,
  pathparams: { [prop: string]: string },
)}
  {@const line = d3.line(
    (d) => xscale(d[0]),
    (d) => yscale(d[1]),
  )}
  {@const dend = (pathparams.fill ?? 'none' !== 'none') ? `V${yscale(0)}` : ''}
  <path
    {...{ 'stroke-width': '2', fill: 'none', ...pathparams }}
    d={line(func.getPlotData(xscale.domain() as [number, number])) + dend}
  />
{/snippet}
<div style="display: inline-block; text-align: center;">
  <select id="select_u" bind:value={uchoice}>
    {#each inputChoices as c (c.label)}
      <option value={c}>{c.label}</option>
    {/each}
  </select>
  <div>
    <Plot width={430} height={220} xlabel="t" xlims={uchoice.xlims} ylabel="u(t)">
      {#snippet content(xscale, yscale)}
        {@render plotpath(xscale, yscale, uchoice.func, { stroke: 'steelblue' })}
      {/snippet}
    </Plot>
  </div>
</div>
<div style="display: inline-block; text-align: center;">
  <select id="select_h" bind:value={hchoice}>
    {#each inputChoices as c (c.label)}
      <option value={c}>{c.label}</option>
    {/each}
  </select>
  <div>
    <Plot width={430} height={220} xlabel="t" xlims={hchoice.xlims} ylabel="h(t)">
      {#snippet content(xscale, yscale)}
        {@render plotpath(xscale, yscale, hchoice.func, { stroke: 'red' })}
      {/snippet}
    </Plot>
  </div>
</div>
<div>
  <Plot
    width={800}
    height={220}
    xlabel="τ"
    xlims={y_xlims}
    ylabel="u(τ), h(t-τ)"
    ondragstart={() => t}
    ondrag={(x, y, deltax, deltay, startt) => {
      t = startt + deltax;
    }}
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, uchoice.func, { stroke: 'steelblue' })}
      {@render plotpath(xscale, yscale, shifted_h_func, { stroke: 'red' })}
      <line
        x1={xscale(t)}
        y1={yscale.range()[0] + 15}
        x2={xscale(t)}
        y2={yscale.range()[1]}
        stroke="gray"
      />
      <text text-anchor="middle" x={xscale(t)} y={yscale.range()[0] + 27}>t</text>
    {/snippet}
  </Plot>
</div>
<div>
  <Plot width={800} height={220} xlabel="τ" xlims={y_xlims} ylabel="u(τ) ⋅ h(t-τ)">
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, new FunctionProduct(uchoice.func, shifted_h_func), {
        stroke: 'green',
        fill: 'lightgreen',
      })}
    {/snippet}
  </Plot>
</div>
<div>
  <Plot
    width={800}
    height={220}
    xlabel="t"
    xlims={y_xlims}
    ylabel="y(t)"
    ondragstart={(x) => {
      t = x;
    }}
    ondrag={(x) => {
      t = x;
    }}
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, y_func, { stroke: 'black' })}
      <line
        x1={xscale(t)}
        y1={yscale.range()[0] + 15}
        x2={xscale(t)}
        y2={yscale.range()[1]}
        stroke="gray"
      />
      <circle
        r="4"
        cx={xscale(t)}
        cy={yscale(y_func.eval(t))}
        stroke="black"
        fill="lightgray"
        stroke-width="1"
      />
    {/snippet}
  </Plot>
</div>
