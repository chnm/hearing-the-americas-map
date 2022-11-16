import * as d3 from "d3";
import Visualization from "../common/visualization";

export default class Map extends Visualization {
    constructor() {
        const margin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        };

        super(id, data, dim, margin);

        this.projection = d3
            .geoAlbers()
            .translate([this.width / 2, this.height / 2])
            .scale(1000);
        this.path = d3.geoPath().projection(this.projection);
    }

    render() {
        this.visualization
            .selectAll("path")
            .data(this.data)
            .enter().append("path")
            .attr("d", this.path)
            .attr("class", "country");
    }
}