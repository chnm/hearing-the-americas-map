import Visualization from "./common/visualization.js";

export default class HearingMap extends Visualization {
  constructor(id, data, dim, margin) {
    super(id, data, dim, margin);

    this.projection = d3
      .geoMercator()
      .translate([this.width / 2, this.height / 2])
      .center([-80, -10])
      .scale(400);
    this.path = d3.geoPath().projection(this.projection);

    this.kScale = 0.5;
    this.centered = null;

    this.jitter = 5;

    // Keep track of components for the year slider
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

    // The tooltip is conditional based on whether we're displaying
    // All data or a single denomination.
    this.tooltipRender = (e, d) => {
      const formatTime = d3.timeFormat("%b %d, %Y");
      const text = 
        `<strong>${d.city}, ${d.country}</strong><br>
        Period of scout visit: ${formatTime(new Date(d.start_date))} - ${formatTime(new Date(d.end_date))}<br>
        Number of recordings: ${d.recordings}<br>
        Scouts:` + // loop through the scouts object to display a list of names
        Object.keys(d.scouts)
          .map((key) => {
            return `<br> - ${d.scouts[key].name}`;
          })
          .join("");
      // Display recordings data
      this.tooltip.html(text);
      this.tooltip.style("visibility", "visible");
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

    // Draw the tooltip
    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .attr("id", "map-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden");
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
          city: d.city,
          lat: +d.lat,
          lon: +d.lon,
          // Scouts need to be separated from their delimiter (;)
          scouts: d.scouts.split(";").map((s) => {
            return {
              name: s,
            };
          }),
          recordings: +d.recordings,
        };
      });

      // We create our array of scouts from recordings.csv to use in the dropdown.
      const scouts = [];
      recordings.forEach((recording) => {
        recording.scouts.forEach((scout) => {
          if (!scouts.includes(scout.name)) {
            scouts.push(scout.name);
          }
        });
      });

      // Trim the whitespace from the scout names.
      scouts.forEach((scout, i) => {
        scouts[i] = scout.trim();
      });

      // Return the unique values of the scouts array and sort alphabetically.
      const filteredScouts = scouts.filter(
        (scout, i) => scouts.indexOf(scout) === i
      );
      filteredScouts.sort();
      // We then add the "All" option to the top of the array.
      filteredScouts.unshift("All");

      // Create a dropdown menu
      d3.select("#scouts-dropdown")
        .append("label")
        .text("Select a scout")
        .append("select")
        .attr("id", "scouts_selection")
        .selectAll("option")
        .data(filteredScouts)
        .join("option")
        .attr("value", (d) => d)
        .text((d) => d);

      // Draw the circles and sort so smallest circles are on top
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
        .attr("stroke-width", 0.5)
        .sort((a, b) => b.recordings - a.recordings);

        // Display the tooltip on mouseover
      this.viz
        .selectAll("circle:not(.legend)")
        .on("mouseover", this.tooltipRender)
        .on("mousemove", () => {
          // Show the tooltip to the right of the mouse, unless we are
          // on the rightmost 25% of the browser.
          if (event.clientX / this.width >= 0.75) {
            this.tooltip
              .style("top", `${event.pageY - 10}px`)
              .style(
                "left",
                `${
                  event.pageX -
                  this.tooltip.node().getBoundingClientRect().width - 10
                }px`
              );
          } else {
            this.tooltip
              .style("top", `${event.pageY - 10}px`)
              .style("left", `${event.pageX + 10}px`);
          }
        })
        .on("mouseout", () => this.tooltip.style("visibility", "hidden"));

      // Zoom to the country when clicked and adjust the stroke width of the circle.
      this.viz.selectAll("circle:not(.legend)").on("click", (e, d) => this.zoom(e, d));

      // If a user selects a scout from the dropdown, filter the data and display those points where
      // a scout's name is attached to a recording location. If "All" is selected, display all points.
      d3.select("#scouts_selection").on("change", (e) => {
        const selectedScout = e.target.value;
        if (selectedScout === "All") {
          this.viz.selectAll("circle").style("display", "block");
        } else {
          this.viz.selectAll("circle").style("display", "none");
          this.viz
            .selectAll("circle")
            .filter((d) => d.scouts.map((s) => s.name).includes(selectedScout))
            .style("display", "block");
        }
      });

      // If a user changes the year slider, filter the data and display those points where
      // the start date is less than or equal to the year selected. Otherwise, display all points.
      d3.select("#timeline").on("change", (e) => {
        const selectedYear = e.target.value;
        this.viz.selectAll("circle").style("display", "none");
        this.viz
          .selectAll("circle")
          // ensure that start_date is only the year
          .filter(
            (d) =>
              d.start_date.split("-")[0] <= selectedYear &&
              d.end_date.split("-")[0] >= selectedYear
          )
          .style("display", "block");
      });

      // If the reset button is pressed, reset to the timeline-label, display all points, and reset the dropdown.
      this.resetButton.addEventListener("click", () => {
        document.getElementById("year-range").innerHTML = "1900-1926";
        document.getElementById("timeline").value = 1900;
        this.viz.selectAll("circle").style("display", "block");
        document.getElementById("scouts_selection").value = "All";
      });
    });
  }
}
