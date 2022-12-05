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
    this.maxRadius = 10;

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
        Period of scout visit: ${formatTime(
          new Date(d.start_date)
        )} - ${formatTime(new Date(d.end_date))}<br>
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
      this.radius = d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d) => d.recordings)])
        .range([0, this.maxRadius]);
    
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

        // Sum the number of recordings for each city and country; keep the lat/lon associated
        // with a city. TODO: We may use this as a toggled option in the future.
        const totalrecordings = {};
        recordings.forEach((recording) => {
          const key = `${recording.city}, ${recording.country}`;
          if (totalrecordings[key]) {
            totalrecordings[key].recordings += recording.recordings;
          } else {
            totalrecordings[key] = {
              recordings: recording.recordings,
              lat: recording.lat,
              lon: recording.lon,
            };
          }
        });

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
        .attr("r", (d) => this.radius(d.recordings))
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
                  this.tooltip.node().getBoundingClientRect().width -
                  10
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
      this.viz
        .selectAll("circle:not(.legend)")
        .on("click", (e, d) => this.zoom(e, d))
        .style("stroke-width", 0.5);

      // Draw the legend.
      const legend = this.viz
      .append('g')
      .attr('fill', '#777')
      .attr('transform', `translate(${this.width - this.maxRadius - 10},${this.height - 10})`)
      .attr('text-anchor', 'middle')
      .style('font', '10px sans-serif')
      .selectAll('g')
      .data(this.radius.ticks(4).slice(1))
      .join('g')
      .classed('legend', true);

    legend.append('circle')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('cy', (d) => -this.radius(d))
      .attr('r', this.radius)
      .classed('legend', true);

    legend.append('text')
      .attr('y', (d) => -2 * this.radius(d))
      .attr('dy', '1.3em')
      .text(this.radius.tickFormat(4, 's'));
    
    legend.append('text')
      .attr('y', -this.radius.range()[1])
      .attr('dy', '-0.7em')
      .text('Recordings');

      // If a user selects a scout from the dropdown, filter the recordings to the selected scout, inclding
      // single and multiple scouts.
      d3.select("#scouts_selection").on("change", (e) => {
        const selectedScout = e.target.value;
        if (selectedScout === "All") {
          this.viz.selectAll("circle").style("display", "block");
        } else {
          this.viz
            .selectAll("circle")
            .style("display", "none")
            .filter((d) => {
              // if scouts are undefined, skip it
              if (!d.scouts) {
                return false;
              }
              // We need to check if the scout is in the array of scouts for each recording. If it is, we
              // return the recording.
              for (let i = 0; i < d.scouts.length; i++) {
                if (d.scouts[i].name.trim() === selectedScout) {
                  return d;
                }
              }
            })
            .style("display", "block");
        }
      });

      // If a user changes the year slider, filter the data and display those points where
      // the start date is less than or equal to the year selected. Otherwise, display all points.
      d3.select("#timeline").on("change", (e) => {
        const selectedYear = e.target.value;
        if (selectedYear === "All") {
          this.viz.selectAll("circle").style("display", "block");
        } else {
          this.viz
            .selectAll("circle")
            .style("display", "none")
            .filter((d) => {
              // if a start date is undefined, skip it
              if (d.start_date === undefined) {
                return;
              }
              const start_year = d.start_date.split('-')[0];
              // const start_year = d.start_date.split('-')[0];
              const end_year = d.end_date.split('-')[0];
              if (start_year <= selectedYear && end_year >= selectedYear) {
                return d;
              }
            })
            .style("display", "block");
        }
      });
      // d3.select("#timeline").on("change", (e) => {
      //   const selectedYear = e.target.value;
      //   this.viz.selectAll("circle").style("display", "none");
      //   this.viz
      //     .selectAll("circle")
      //     // ensure that start_date is only the year
      //     .filter(
      //       (d) =>
      //         d.start_date.split("-")[0] <= selectedYear &&
      //         d.end_date.split("-")[0] >= selectedYear
      //     )
      //     .style("display", "block");
      // });

      // If the user selects a year without any points to display, print a message
      // on the map for the user to see.
      d3.select("#timeline").on("input", (e) => {
        const selectedYear = e.target.value;
        // Check if the data is empty
        if (
          this.viz
            .selectAll("circle:not(.legend)")
            .filter(
              (d) =>
                d.start_date.split("-")[0] <= selectedYear &&
                d.end_date.split("-")[0] >= selectedYear
            )
            .empty()
        ) {
          this.viz
            .append("text")
            .attr("class", "no-data")
            .attr("x", this.width / 2)
            .attr("y", this.height / 2)
            .attr("text-anchor", "middle")
            .text("No data available for this year");
        } else {
          d3.select(".no-data").remove();
        }
      });

      // If the user presses the play button, advance the year slider by one year every second. This also
      // updates the map to display the points for the selected year.
      d3.select("#play-timeline").on("click", () => {
        // Set the scout selector to "All" so that all points are displayed.
        d3.select("#scouts_selection").property("value", "All");
        // If the play button is clicked, change the icon to a pause button.
        const playButton = d3.select("#play-timeline");
        // Don't display the "no-data" message if the user is playing the timeline. If the "no-data" message is
        // present, remove it.
        if (d3.select(".no-data").node()) {
          d3.select(".no-data").remove();
        }
        if (playButton.text() === "Play") {
          playButton.text("Pause");
          d3.select("#reset-timeline").attr("disabled", true);
          this.animation = setInterval(() => {
            const slider = d3.select("#timeline");
            const currentYear = parseInt(slider.property("value"));
            const maxYear = parseInt(slider.property("max"));
            // Display the current year in year-range
            d3.select("#year-range").text(currentYear);
            if (currentYear < maxYear) {
              slider.property("value", currentYear + 1);
              slider.dispatch("change");
            } else {
              // when the slider reaches the end, pause the slider at the end
              slider.property("value", 1926);
              slider.dispatch("change");
            }
          }, 1000);
        } else {
          playButton.text("Play");
          d3.select("#reset-timeline").attr("disabled", null);
          clearInterval(this.animation);
        }
      });

      // If the reset button is pressed, reset to the timeline-label, display all points, and reset the dropdown.
      this.resetButton.addEventListener("click", () => {
        document.getElementById("year-range").innerHTML = "1903-1926";
        document.getElementById("timeline").value = 1903;
        this.viz.selectAll("circle").style("display", "block");
        document.getElementById("scouts_selection").value = "All";
        // If .no-data is present, remove it.
        if (d3.select(".no-data").node()) {
          d3.select(".no-data").remove();
        }
      });
    });
  }
}
