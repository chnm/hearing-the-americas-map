import Visualization from "./common/visualization.js";

export default class HearingMap extends Visualization {
  constructor(id, data, dim, margin) {
    super(id, data, dim, margin);

    this.projection = d3
      .geoMercator()
      .translate([this.width / 2, this.height / 2])
      .center([-82.366, 6.113])
      .scale(480);
    this.path = d3.geoPath().projection(this.projection);

    this.kScale = 0.5;
    this.centered = null;

    this.jitter = 5;
    this.timer = null;

    this.playButton = document.getElementById("play-timeline");
    this.resetButton = document.getElementById("reset-timeline");

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
    };
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
          start_date: d.start_date,
          end_date: d.end_date,
          country: d.country,
          lat: +d.lat,
          lon: +d.lon,
          scouts: d.scouts,
          recordings: +d.recordings,
        };
      });

      // We create our array of scouts from recordings.csv to use in the dropdown.
      const scouts = [];
      recordings.forEach((d) => {
        scouts.push(d.scouts);
      });
      // We then separate scouts by delimiter, return a unique array of scouts, and sort.
      const uniqueScouts = scouts
        .join(";")
        .split(";")
        .filter((d, i, a) => a.indexOf(d) === i)
        .sort();
      // Trim white space from each scout name
      const trimmedScouts = uniqueScouts.map((d) => d.trim());
      // We then add the "All" option to the top of the array.
      trimmedScouts.unshift("All");

      // Create a dropdown menu
      d3.select("#scouts-dropdown")
        .append("label")
        .text("Select a scout")
        .append("select")
        .attr("id", "scouts_selection")
        .selectAll("option")
        .data(trimmedScouts)
        .join("option")
        .attr("value", (d) => d)
        .text((d) => d);

      d3.select("#map__dropdown_scouts--select")
        .selectAll("option")
        .data(trimmedScouts)
        .enter()
        .append("option")
        .attr("value", (d) => d)
        .text((d) => d);

      // Retrieve the value of the range slider
      const slider = document.getElementById("timeline");
      slider.addEventListener("change", () => {
        const year = slider.valueAsNumber;
        console.log(year);
      });

      // Draw the circles
      this.viz
        .selectAll("circle")
        .data(recordings)
        .enter()
        .append("circle")
        .attr(
          "cx",
          (d) =>
            this.projection([d.lon, d.lat])[0] - Math.random() * this.jitter
        )
        .attr(
          "cy",
          (d) =>
            this.projection([d.lon, d.lat])[1] - Math.random() * this.jitter
        )
        .attr("r", (d) => Math.sqrt(d.recordings / Math.PI))
        .classed("point", true)
        .attr("stroke-width", 0.5);

      // Zoom to the country when clicked and adjust the stroke width of the circle.
      this.viz.selectAll("circle").on("click", (e, d) => this.zoom(e, d));

      // If the reset button is pressed, reset to the timeline-label to 1910-1932
      this.resetButton.addEventListener("click", () => {
        document.getElementById("year-range").innerHTML = "1910-1932";
      });
    });
  }
}
