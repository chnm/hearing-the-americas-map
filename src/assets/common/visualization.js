export default class Visualization {
  constructor(id, data, dim, margin) {
    this.data = data;
    this.margin = margin;

    // Select the SVG, figure out the correct height, and use the
    // viewBox property to make it scale responsively.
    this.svg = d3.select(id);
    this.width = dim.width;
    this.height = dim.height;
    const outerWidth = this.width + this.margin.left + this.margin.right;
    const outerHeight = this.height + this.margin.top + this.margin.bottom;
    this.svg.attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`);

    // The viz is the usable part of the plot, excluding the margins.
    this.viz = this.svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  }
}