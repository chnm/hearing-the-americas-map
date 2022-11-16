import * as d3 from 'd3';

export default class Visualization {
    constructor(id, data, dim, margin) {
        this.data = data;
        this.margin = margin;

        this.svg = d3.select(id);
        this.width = dim.width;
        this.height = dim.height;

        const outerWidth = this.width + this.margin.left + this.margin.right;
        const outerHeight = this.height + this.margin.top + this.margin.bottom;
        this.svg.attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`);

        this.visualization = this.svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    }
}
