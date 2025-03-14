export interface PlottableFunction {
  getPlotData(range: readonly [number, number]): [number, number][];
  eval(x: number): number;
}

export class Rect implements PlottableFunction {
  shift = 0;
  scale = 1;
  constructor(options: { shift?: number; scale?: number } = {}) {
    this.shift = options?.shift ?? 0;
    this.scale = options?.scale ?? 1;
  }
  getPlotData(range: [number, number]): [number, number][] {
    const l = this.shift - 0.5 * this.scale;
    const r = this.shift + 0.5 * this.scale;
    const data = [[range[0], l <= range[0] && range[0] <= r ? 1 : 0] as [number, number]];
    if (l < r) {
      if (range[0] <= l && range[1] >= l) {
        data.push([l, 0], [l, 1]);
      }
      if (range[0] <= r && range[1] >= r) {
        data.push([r, 1], [r, 0]);
      }
    }
    data.push([range[1], l <= range[1] && range[1] <= r ? 1 : 0]);
    return data;
  }
  eval(x: number) {
    x = (x - this.shift) / this.scale;
    return -0.5 <= x && x <= 0.5 ? 1 : 0;
  }
}

export class Tri implements PlottableFunction {
  shift = 0;
  scale = 1;
  constructor(options: { shift?: number; scale?: number } = {}) {
    this.shift = options?.shift ?? 0;
    this.scale = options?.scale ?? 1;
  }
  getPlotData(range: [number, number]): [number, number][] {
    const l = this.shift - this.scale;
    const m = this.shift;
    const r = this.shift + this.scale;
    const data = [[range[0], this.eval(range[0])] as [number, number]];
    if (range[0] < l && range[1] > l) {
      data.push([l, 0]);
    }
    if (range[0] < m && range[1] > m) {
      data.push([m, 1]);
    }
    if (range[0] < r && range[1] > r) {
      data.push([r, 0]);
    }
    data.push([range[1], this.eval(range[1])]);
    return data;
  }
  eval(x: number) {
    x = (x - this.shift) / this.scale;
    return x < -1 ? 0 : x < 0 ? 1 + x : x < 1 ? 1 - x : 0;
  }
}

export class CausalExp implements PlottableFunction {
  shift = 0;
  scale = 1;
  constructor(options: { shift?: number; scale?: number } = {}) {
    this.shift = options?.shift ?? 0;
    this.scale = options?.scale ?? 1;
  }
  getPlotData(range: [number, number]): [number, number][] {
    const x0 = this.shift;
    const data = [[range[0], this.eval(range[0])] as [number, number]];
    if (range[0] <= 0) {
      data.push([0, 0]);
    }
    for (let x = Math.max(x0, range[0]); x <= range[1]; x += this.scale / 30) {
      data.push([x, this.eval(x)]);
    }
    data.push([range[1], this.eval(range[1])]);
    return data;
  }
  eval(x: number) {
    x = (x - this.shift) / this.scale;
    return x < 0 ? 0 : Math.exp(-x);
  }
}

export class FunctionProduct implements PlottableFunction {
  private func1: PlottableFunction;
  private func2: PlottableFunction;
  constructor(func1: PlottableFunction, func2: PlottableFunction) {
    this.func1 = func1;
    this.func2 = func2;
  }
  getPlotData(range: [number, number]): [number, number][] {
    const plotData1 = this.func1.getPlotData(range);
    const plotData2 = this.func2.getPlotData(range);
    const plotDataCombined: [number, number, number][] = [];

    let idx1 = 0;
    let idx2 = 0;
    while (idx1 < plotData1.length && idx2 < plotData2.length) {
      if (plotData1[idx1][0] == plotData2[idx2][0]) {
        const x = plotData1[idx1][0];
        plotDataCombined.push([x, plotData1[idx1][1], plotData2[idx2][1]]);
        idx1++;
        idx2++;
      } else if (plotData1[idx1][0] <= plotData2[idx2][0]) {
        const x = plotData1[idx1][0];
        plotDataCombined.push([x, plotData1[idx1][1], this.func2.eval(x)]);
        idx1++;
      } else {
        const x = plotData2[idx2][0];
        plotDataCombined.push([x, this.func1.eval(x), plotData2[idx2][1]]);
        idx2++;
      }
    }
    while (idx1 < plotData1.length) {
      const x = plotData1[idx1][0];
      plotDataCombined.push([x, plotData1[idx1][1], this.func2.eval(x)]);
      idx1++;
    }
    while (idx2 < plotData2.length) {
      const x = plotData2[idx2][0];
      plotDataCombined.push([x, this.func1.eval(x), plotData2[idx2][1]]);
      idx2++;
    }
    const plotData: [number, number][] = [];
    for (let idx = 0; idx < plotDataCombined.length - 1; idx++) {
      if (
        plotDataCombined[idx][0] == plotDataCombined[idx + 1][0] ||
        plotDataCombined[idx][1] == plotDataCombined[idx + 1][1] ||
        plotDataCombined[idx][2] == plotDataCombined[idx + 1][2]
      ) {
        // line segment
        plotData.push([
          plotDataCombined[idx][0],
          plotDataCombined[idx][1] * plotDataCombined[idx][2],
        ]);
      } else {
        for (
          let x = plotDataCombined[idx][0];
          x < plotDataCombined[idx + 1][0];
          x += 0.01
        ) {
          plotData.push([x, this.func1.eval(x) * this.func2.eval(x)]);
        }
      }
    }
    plotData.push([
      plotDataCombined[plotDataCombined.length - 1][0],
      plotDataCombined[plotDataCombined.length - 1][1] *
        plotDataCombined[plotDataCombined.length - 1][2],
    ]);

    return plotData;
  }
  eval(x: number) {
    return this.func1.eval(x) * this.func2.eval(x);
  }
}
