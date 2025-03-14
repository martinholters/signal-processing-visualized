<script lang="ts" generics="DragContext=void">
  import * as d3 from 'd3';
  import { onMount, type Snippet } from 'svelte';

  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 40;
  const marginLeft = 50;

  type Props = Partial<{
    width: number;
    height: number;
    xlabel: string;
    ylabel: string;
    xlims: readonly [number, number];
    ylims: readonly [number, number];
    dragruleposition: null | number;
    ondragstart: (x: number, y: number) => DragContext;
    ondrag: (x: number, y: number, deltax: number, deltay: number, extra: DragContext) => void;
    content: null | Snippet<
      [d3.ScaleContinuousNumeric<number, number>, d3.ScaleContinuousNumeric<number, number>]
    >;
  }>;
  let {
    width = 500,
    height = 300,
    xlabel = 'x',
    ylabel = 'y',
    xlims = [-1, 1],
    ylims = [0, 1],
    content = null,
    ondragstart = () => { return undefined as DragContext; },
    ondrag = (x, y, deltax, deltay) => {},
  }: Props = $props();

  let plot_node: SVGSVGElement;
  let xaxis_node: SVGGElement;
  let yaxis_node: SVGGElement;

  const xscale = $derived(d3.scaleLinear(xlims, [marginLeft, width - marginRight]));
  const yscale = $derived(d3.scaleLinear(ylims, [height - marginBottom, marginTop]));

  $effect(() => {
    d3.select(xaxis_node).call(d3.axisBottom(xscale));
    d3.select(yaxis_node).call(d3.axisLeft(yscale));
  });

  onMount(() => {
    let dragStartX = 0;
    let dragStartY = 0;
    let dragCtx: DragContext;
    d3.select(plot_node).call(
      d3
        .drag<SVGSVGElement, unknown>()
        .on('start', (event) => {
          dragStartX = xscale.invert(event.x);
          dragStartY = yscale.invert(event.y);
          dragCtx = ondragstart(dragStartX, dragStartY);
        })
        .on('drag', (event) => {
          const x = xscale.invert(event.x);
          const y = yscale.invert(event.y);
          ondrag(x, y, x - dragStartX, y - dragStartY, dragCtx);
        }),
    );
  });
</script>

<svg bind:this={plot_node} {width} {height}>
  <g bind:this={xaxis_node} transform="translate(0, {height - marginBottom})" />
  <g bind:this={yaxis_node} transform="translate({marginLeft}, 0)" />
  <text text-anchor="middle" x={(marginLeft + width - marginRight) / 2} y={height}>
    {xlabel}
  </text>
  <text
    text-anchor="middle"
    x={-(marginTop + height - marginBottom) / 2}
    y="15"
    transform="rotate(-90)"
  >
    {ylabel}
  </text>
  {#if content}
    {@render content(xscale, yscale)}
  {/if}
</svg>
