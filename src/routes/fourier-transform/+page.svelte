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

  class Const implements PlottableFunction {
    value = 0;
    constructor(value = 0) {
      this.value = value;
    }
    getPlotData(range: [number, number]): [number, number][] {
      return [
        [range[0], this.value],
        [range[1], this.value],
      ];
    }
    eval() {
      return this.value;
    }
  }

  class Sinc implements PlottableFunction {
    shift = 0;
    scale = 1;
    constructor(options: { shift?: number; scale?: number } = {}) {
      this.shift = options?.shift ?? 0;
      this.scale = options?.scale ?? 1;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (let x = range[0]; x < range[1]; x += this.scale / 30) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      x = (x - this.shift) / this.scale;
      return x != 0 ? Math.sin(2 * Math.PI * x) / (2 * Math.PI * x) : 1;
    }
  }

  class Cos implements PlottableFunction {
    omega = 0;
    phase = 0;
    constructor(options: { omega?: number; phase?: number } = {}) {
      this.omega = options?.omega ?? 1;
      this.phase = options?.phase ?? 0;
    }
    getPlotData(range: [number, number]): [number, number][] {
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      if (this.omega != 0) {
        for (let x = range[0]; x < range[1]; x += 1 / (30 * Math.abs(this.omega))) {
          data.push([x, this.eval(x)]);
        }
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      return Math.cos(x * this.omega + this.phase);
    }
  }

  class LP1Real implements PlottableFunction {
    getPlotData(range: [number, number]): [number, number][] {
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (let x = range[0]; x < range[1]; x += Math.abs(x) / 4 + 0.01) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      return 1 / (1 + x * x);
    }
  }

  class LP1Imag implements PlottableFunction {
    getPlotData(range: [number, number]): [number, number][] {
      const data = [[range[0], this.eval(range[0])] as [number, number]];
      for (let x = range[0]; x < range[1]; x += Math.abs(x) / 4 + 0.01) {
        data.push([x, this.eval(x)]);
      }
      data.push([range[1], this.eval(range[1])]);
      return data;
    }
    eval(x: number) {
      return x / (1 + x * x);
    }
  }

  const inputChoices = [
    {
      label: 'rect(t)',
      func: new Rect(),
      xlims: [-1, 1] as const,
      X_real: new Sinc({ scale: 4 * Math.PI }),
      X_imag: new Const(0),
      omega_max: 40,
    },
    {
      label: 'rect(t-½)',
      func: new Rect({ shift: 0.5 }),
      xlims: [-0.5, 1.5] as const,
      X_real: new FunctionProduct(
        new Sinc({ scale: 4 * Math.PI }),
        new Cos({ omega: 1 / 2 }),
      ),
      X_imag: new FunctionProduct(
        new Sinc({ scale: 4 * Math.PI }),
        new Cos({ omega: 1 / 2, phase: -Math.PI / 2 }),
      ),
      omega_max: 40,
    },
    {
      label: 'rect(t+½)',
      func: new Rect({ shift: -0.5 }),
      xlims: [-1.5, 0.5] as const,
      X_real: new FunctionProduct(
        new Sinc({ scale: 4 * Math.PI }),
        new Cos({ omega: -1 / 2 }),
      ),
      X_imag: new FunctionProduct(
        new Sinc({ scale: 4 * Math.PI }),
        new Cos({ omega: -1 / 2, phase: -Math.PI / 2 }),
      ),
      omega_max: 40,
    },
    {
      label: 'tri(t)',
      func: new Tri(),
      xlims: [-1.5, 1.5] as const,
      X_real: new FunctionProduct(
        new Sinc({ scale: 4 * Math.PI }),
        new Sinc({ scale: 4 * Math.PI }),
      ),
      X_imag: new Const(0),
      omega_max: 20,
    },
    {
      label: 'exp(-t)⋅ϵ(t)',
      func: new CausalExp(),
      xlims: [-0.5, 2.5] as const,
      X_real: new LP1Real(),
      X_imag: new LP1Imag(),
      omega_max: 20,
    },
  ];

  let omega = $state(0);
  let xchoice = $state(inputChoices[0]);
  let kernel_real = $derived(new Cos({ omega }));
  let kernel_imag = $derived(new Cos({ omega, phase: -Math.PI / 2 }));
  let integrand_real = $derived(new FunctionProduct(xchoice.func, kernel_real));
  let integrand_imag = $derived(new FunctionProduct(xchoice.func, kernel_imag));

  $effect(() => {
    if (omega > xchoice.omega_max) {
      omega = xchoice.omega_max;
    }
    if (omega < -xchoice.omega_max) {
      omega = -xchoice.omega_max;
    }
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
  <select id="select_u" bind:value={xchoice}>
    {#each inputChoices as c}
      <option value={c}>{c.label}</option>
    {/each}
  </select>
  <div>
    <Plot width={430} height={220} xlabel="t" xlims={xchoice.xlims} ylabel="x(t)">
      {#snippet content(xscale, yscale)}
        {@render plotpath(xscale, yscale, xchoice.func, { stroke: 'steelblue' })}
      {/snippet}
    </Plot>
  </div>
</div>
<div>
  <Plot
    width={430}
    height={220}
    xlabel="t"
    xlims={xchoice.xlims}
    ylims={[-1, 1]}
    ylabel="cos(ωt)"
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, kernel_real, { stroke: 'steelblue' })}
    {/snippet}
  </Plot>
  <Plot
    width={430}
    height={220}
    xlabel="t"
    xlims={xchoice.xlims}
    ylims={[-1, 1]}
    ylabel="sin(ωt)"
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, kernel_imag, { stroke: 'steelblue' })}
    {/snippet}
  </Plot>
</div>
<div>
  <Plot
    width={430}
    height={220}
    xlabel="t"
    xlims={xchoice.xlims}
    ylims={[-1, 1]}
    ylabel="x(t) ⋅ cos(ωt)"
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, integrand_real, {
        stroke: 'steelblue',
        fill: 'lightblue',
      })}
    {/snippet}
  </Plot>
  <Plot
    width={430}
    height={220}
    xlabel="t"
    xlims={xchoice.xlims}
    ylims={[-1, 1]}
    ylabel="x(t) ⋅ sin(ωt)"
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, integrand_imag, {
        stroke: 'steelblue',
        fill: 'lightblue',
      })}
    {/snippet}
  </Plot>
</div>

<div>
  <Plot
    width={430}
    height={220}
    xlabel="ω"
    xlims={[-xchoice.omega_max, xchoice.omega_max]}
    ylabel="Re(X(jω))"
    ylims={[-0.8, 1]}
    ondragstart={(x) => {
      omega = x;
    }}
    ondrag={(x) => {
      omega = x;
    }}
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, xchoice.X_real, { stroke: 'black' })}
      <line
        x1={xscale(omega)}
        y1={yscale.range()[0] + 15}
        x2={xscale(omega)}
        y2={yscale.range()[1]}
        stroke="gray"
      />
      <circle
        r="4"
        cx={xscale(omega)}
        cy={yscale(xchoice.X_real.eval(omega))}
        stroke="black"
        fill="lightgray"
        stroke-width="1"
      />
    {/snippet}
  </Plot>
  <Plot
    width={430}
    height={220}
    xlabel="ω"
    xlims={[-xchoice.omega_max, xchoice.omega_max]}
    ylabel="Im(X(jω))"
    ylims={[-0.8, 1]}
    ondragstart={(x) => {
      omega = x;
    }}
    ondrag={(x) => {
      omega = x;
    }}
  >
    {#snippet content(xscale, yscale)}
      {@render plotpath(xscale, yscale, xchoice.X_imag, { stroke: 'black' })}
      <line
        x1={xscale(omega)}
        y1={yscale.range()[0] + 15}
        x2={xscale(omega)}
        y2={yscale.range()[1]}
        stroke="gray"
      />
      <circle
        r="4"
        cx={xscale(omega)}
        cy={yscale(xchoice.X_imag.eval(omega))}
        stroke="black"
        fill="lightgray"
        stroke-width="1"
      />
    {/snippet}
  </Plot>
</div>
