import Visualization from "./common/visualization.js";

export default class HearingMap extends Visualization {
  constructor(id, data, dim, margin) {
    super(id, data, dim, margin);

    this.projection = d3
      .geoMercator()
      .translate([this.width / 2, this.height / 2])
      .center([-82.366, 23.113])
      .scale(600);
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
    
      this.viz
      .append("path")
      .datum(this.data.southamerica)
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
    
      this.viz
      .selectAll("path")
      .data(this.data.southamerica.features)
      .enter()
      .append("path")
      .attr("d", this.path)
      .attr("class", "country");
  }

  update() {
    // Read the CSV data
    d3.csv("data/recordings.csv").then((data) => {
      // Create a new array of objects
      const recordings = data.map((d) => {
        return {
          id: d.id,
          date: d.date,
          country: d.country,
          lat: +d.lat,
          lon: +d.lon,
          recordings: +d.recordings
        };
      });

      // Draw the circles
      this.viz
        .selectAll("circle")
        .data(recordings)
        .enter()
        .append("circle")
        // TODO: if the points overlap (i.e., cx == cx), jitter them
        .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
        .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
        .attr("r", (d) => Math.sqrt(d.recordings))
        .classed("point", true)
        .attr("stroke-width", 0.5);
    });
  }
}
