import Visualization from "./common/visualization.js";

export default class HearingMap extends Visualization {
  constructor(id, data, dim, margin) {
    super(id, data, dim, margin);

    this.projection = d3
      .geoMercator()
      .translate([this.width / 2, this.height / 2])
      .center([-82.366, 23.113])
      .scale(400);
    this.path = d3.geoPath().projection(this.projection);

    this.kScale = 0.5;
    this.centered = null;

    this.jitter = 5;

    this.zoom = (e, d) => {
      let x, y, k;
      if (d && this.centered !== d) {
        const coords = this.projection([d.lon, d.lat]);
        [x, y] = coords;
        k = 10;
        this.kScale = 4;
        this.centered = d;
      } else {
        x = this.width / 2;
        y = this.height / 2;
        k = 1;
        this.kScale = 1;
        this.centered = null;
      }

      this.viz
        .transition()
        .duration(750)
        .attr(
          "transform",
          `translate(${this.width / 2},${this.height / 2})
          scale(${k}) translate(${-x},${-y})`
        );
      
      this.viz 
          .selectAll(".country")
          .transition()
          .duration(750)
          .attr("stroke-width", `${0.5 / this.kScale}px`);
      
      this.viz
          .selectAll(".point")
          .transition()
          .duration(750)
          .attr("stroke-width", `${1 / this.kScale}px`);
    }
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
    
      this.viz
      .append("rect")
      .attr("class", "overlay")
      .attr("width", this.width)
      .attr("height", this.height)
      .on("click", this.zoom);
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
        .attr("cx", (d) => this.projection([d.lon, d.lat])[0] - (Math.random() * this.jitter) )
        .attr("cy", (d) => this.projection([d.lon, d.lat])[1] - (Math.random() * this.jitter) )
        .attr("r", (d) => Math.sqrt(d.recordings / Math.PI))
        .classed("point", true)
        .attr("stroke-width", 0.5);
      
      // Zoom to the country when clicked and adjust the stroke width of the circle.
      this.viz
      .selectAll("circle")
      .on("click", (e, d) => this.zoom(e, d));
    });
  }
}
