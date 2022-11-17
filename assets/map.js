import Visualization from "./../common/visualization.js";

export default class HearingMap extends Visualization {
  constructor(id, data, dim, margin) {
    super(id, data, dim, margin);

    this.projection = d3
      .geoMercator()
      .translate([this.width / 2, this.height / 2])
      .center([-99.13, 19.43])
      .scale(1000);
    this.path = d3.geoPath().projection(this.projection);
  }

  render() {
    // Color the map water features
    this.viz
        .append("path")
        .datum(this.data.northamerica)
        .attr("d", this.path)
        .attr("fill", "#F0F0F4")
        .attr("stroke", "#000000")
        .attr("stroke-width", 0.5);
    
    // Draw the map features
    this.viz
      .selectAll("path")
      .data(this.data.northamerica.features)
      .enter()
      .append("path")
      .attr("d", this.path)
      .attr("class", "country");

    // this.viz
    //   .append("rect")
    //   .attr("class", "overlay")
    //   .attr("width", this.width)
    //   .attr("height", this.height);
    //   .on("click", this.zoom);
  }
}
