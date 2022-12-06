import Visualization from "./common/visualization.js";

export default class HearingChart extends Visualization {
  constructor(id, data, dim, margin) {
    super(id, data, dim, margin);

    // We will plot scount travels to lat/lon points on a map. 
    this.projection = d3
      .geoMercator()
      .translate([this.width / 2, this.height / 2])
      .center([-80, -10])
      .scale(400);
    this.path = d3.geoPath().projection(this.projection);

    this.centered = null;

    // Line generator with curveCatmullRom curve
    this.line = d3
        .line()
        .x((d) => this.projection([d.lon, d.lat])[0])
        .y((d) => this.projection([d.lon, d.lat])[1])
        .curve(d3.curveCatmullRom.alpha(0.5));

  }

  render() {
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
    // We will add points to the map for lat/lon and draw a line between them. 
    // The title of the point will be the year it was visited. 

    d3.csv("data/recordings.csv").then((data) => {
        const recordings_point = data.map((d) => {
            return {
                year: d.start_date.split("-")[0],
                lat: +d.lat,
                lon: +d.lon,
            };
            });
        console.log("point records", recordings_point);

        // Add the points to the map
        this.viz
            .selectAll("circle")
            .data(recordings_point)
            .enter()
            .append("circle")
            .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
            .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
            .attr("r", 2)
            .attr("fill", "#000000")
            .attr("stroke", "#000000")
            .attr("stroke-width", 0.5)
            .text((d) => d.year)
            .attr("class", "point__network");
        
        // Add the lines to the map. There should be a line for each year.
        // We will use the nest function to group the points by year.
        const recordings_line = d3
            .nest()
            .key((d) => d.year)
            .entries(recordings_point);
        
        console.log("line records", recordings_line);

        // Add the lines to the map
        this.viz
            .selectAll("path")
            .data(recordings_line)
            .enter()
            .append("path")
            .attr("d", (d) => this.line(d.values))
            .attr("fill", "none")
            .attr("stroke", "#000000")
            .attr("stroke-width", 0.5)
            .attr("class", "line__network");
    });
  }
}
