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

    // The two tooltips handle different data, 
    // so they are separated out into two functions for all data and 
    // individual data.
    this.tooltipRenderAllData = (e, d) => {
      console.log('moused over alldata')
      const formatTime = d3.timeFormat("%b %d, %Y");
      let text = "";
        text = `<strong>${d.city}, ${d.country}</strong><br/>
        Years active: ${
          // display the list of years from the years array and return each object
          // d.years.map((y) => y.year).join(", ")
          d.years
        }<br/>
        Recordings: ${d.recordings}`;

      // Display recordings data
      this.tooltip.html(text);
      this.tooltip.style("visibility", "visible");
    };

    this.tooltipRenderIndividualData = (e, d) => {
      console.log('moused over individual data');
      const formatTime = d3.timeFormat("%b %d, %Y");
      let text = "";
        text = `<strong>${d.city}, ${d.country}</strong><br/>
        Dates of visit: ${formatTime(d.start_date)} - ${formatTime(d.end_date)}<br/>
        Recordings: ${d.recordings}`;

      // Display recordings data
      this.tooltip.html(text);
      this.tooltip.style("visibility", "visible");
    }
  }

  render() {
    this.viz
      .append("path")
      .datum(this.data.northamerica)
      .attr("d", this.path)
      .attr("fill", "#F0F0F4")
      .attr("stroke", "transparent")
      .attr("stroke-width", 0.5);

    this.viz
      .append("path")
      .datum(this.data.southamerica)
      .attr("d", this.path)
      .attr("fill", "#F0F0F4")
      .attr("stroke", "transparent")
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
    d3.csv("./src/data/recordings.csv").then((data) => {
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
      // We also trim whitespace from the scout names.
      const scouts = [];
      recordings.forEach((recording) => {
        recording.scouts.forEach((scout) => {
          if (!scouts.includes(scout.name)) {
            scouts.push(scout.name.trim());
          }
        });
      });

      // Return the unique values of the scouts array and sort alphabetically.
      const filteredScouts = scouts.filter(
        (scout, i) => scouts.indexOf(scout) === i
      );
      filteredScouts.sort();
      // We then add the "All" option to the top of the array.
      filteredScouts.unshift("All");

      // Create a dropdown menu for the scouts.
      d3.select("#scouts-dropdown")
        .append("label")
        .text("Scouts: ")
        .append("select")
        .attr("id", "scouts_selection")
        .selectAll("option")
        .data(filteredScouts)
        .join("option")
        .attr("class", "scout")
        .attr("value", (d) => d)
        .text((d) => d);

      // We need to adjust the recordings data to include a nested object of
      // scouts that have multiple cities and their total recordings, so we can
      // display the sum of their recordings when their name is selected
      // from the dropdown.
      recordings.forEach((recording) => {
        recording.scouts.forEach((scout) => {
          const key = `${scout.name.trim()}`;
          if (recording.scouts[key]) {
            recording.scouts[key].recordings += recording.recordings;
          } else {
            recording.scouts[key] = {
              recordings: recording.recordings,
              lat: recording.lat,
              lon: recording.lon,
              city: recording.city,
              country: recording.country,
              start_date: recording.start_date,
              end_date: recording.end_date,
            };
          }
        });
      });

      // We also need to determine recordings per city. This will be used in the selection of
      // "All" in the dropdown.
      const recordingsPerCity = {};
      recordings.forEach((recording) => {
        const key = `${recording.city.trim()}`;
        if (recordingsPerCity[key]) {
          recordingsPerCity[key].recordings += recording.recordings;
        } else {
          recordingsPerCity[key] = {
            recordings: recording.recordings,
            lat: recording.lat,
            lon: recording.lon,
            city: recording.city,
            country: recording.country
          };
        }
      });

      // We need to determine the years of each recording per city, which we will
      // push to recordingsPerCity. We need to find the earliest start date and the
      // latest end date for each city. We will use this to determine the range of
      // years for each city. We will parse the yyyy-mm-dd format to yyyy.
      recordings.forEach((recording) => {
        const key = `${recording.city.trim()}`;
        if (recordingsPerCity[key]) {
          recordingsPerCity[key].start_date = d3.min([
            recordingsPerCity[key].start_date,
            recording.start_date.substring(0, 4),
          ]);
          recordingsPerCity[key].end_date = d3.max([
            recordingsPerCity[key].end_date,
            recording.end_date.substring(0, 4),
          ]);
        } else {
          recordingsPerCity[key] = {
            start_date: recording.start_date.substring(0, 4),
            end_date: recording.end_date.substring(0, 4),
          };
        }
      });

      // We will append to the recordingsPerCity an array of each year
      // that a recording was made in that city. We will parse the yyyy-mm-dd
      // for the yyyy value and push it to the array, returning only those years
      // that a recording was made for that city. Then, we'll return just unique 
      // values of the array.
      recordings.forEach((recording) => {
        const key = `${recording.city.trim()}`;
        if (recordingsPerCity[key]) {
          recordingsPerCity[key].years = recordings
            .filter((d) => d.city === recording.city)
            .map((d) => d.start_date.substring(0, 4))
            .filter((d, i, a) => a.indexOf(d) === i);
        } else {
          recordingsPerCity[key] = {
            years: recordings
              .filter((d) => d.city === recording.city)
              .map((d) => d.start_date.substring(0, 4))
              .filter((d, i, a) => a.indexOf(d) === i),
          };
        }
      });
 
      // Now, we add the recordingsPerScout object and recordingsPerCity object to the
      // recordings array as new properties at the end of the array. It also needs to
      // be an array of objects, so we use Object.entries() to convert it to an array of
      // arrays and give it a name of "totalscouts" and "totalcities".
      // recordings.push({ totalscouts: Object.entries(recordingsPerScout) });
      let totaldata = [];
      totaldata.push({ totalcities: Object.entries(recordingsPerCity) });
      totaldata.push({ recordings: recordings });

      console.log(totaldata)

      // The function to display all data.
      this.displayAllData = () => {
        // We display data from `totalcities`
        const allData = totaldata[0].totalcities.map((d) => {
          return {
            city: d[1].city,
            country: d[1].country,
            lat: d[1].lat,
            lon: d[1].lon,
            recordings: d[1].recordings,
          };
        });

        // We then display the data.
        this.viz
          .selectAll("circle")
          .data(allData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          .attr("r", (d) => this.radius(d.recordings))
          .attr("fill", "red")
          .attr("class", "point");
      };

      // The function to display the data for a scout.
      this.displayScoutData = (scout) => {
        // We filter the data for the selected scout.
        const scoutData = totaldata[1].recordings.filter((d) => {
          return d.scouts.some((s) => s.name.trim() === scout);
        });
        // We then display the data.
        this.viz
          .selectAll("circle")
          .data(scoutData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          .attr("r", (d) => this.radius(d.recordings))
          .attr("fill", "red")
          .attr("class", "point");
      };

      // The function to display the data for a year.
      this.displayYearData = (year) => {
        // We filter the data for the selected year.
        const yearData = totaldata[1].recordings.filter((d) => {
          // we filter the data for the selected year by 
          // converting d.start_date by getting the first 4 characters
          // and converting it to a number. We then compare it to the
          // selected year.
          return Number(d.start_date.substring(0, 4)) === year;
        });
        // We then display the data.
        this.viz
          .selectAll("circle")
          .data(yearData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          .attr("r", (d) => this.radius(d.recordings))
          .attr("fill", "red")
          .attr("class", "point");
      };

      // The function to display the data for a scout and a year.
      this.displayScoutYearData = (scout, year) => {
        // We filter the data for the selected scout and year.
        const scoutYearData = totaldata[1].recordings.filter((d) => {
          return (
            d.scouts.some((s) => s.name.trim() === scout) && Number(d.start_date.substring(0, 4)) === year
          );
        });
        // We then display the data.
        this.viz
          .selectAll("circle")
          .data(scoutYearData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          .attr("r", (d) => this.radius(d.recordings))
          .attr("fill", "red")
          .attr("class", "point");
      };

      // This function handles the displaying of the data. It accepts a scout
      // and a year as arguments. If no scout or year is selected, it displays
      // all the data. It calls the appropriate function to display the data.
      this.displayData = (scout, year) => {
        // If no scout or year is selected, display all the data.
        if (!scout && !year) {
          this.displayAllData();
        } else {
          // If a scout is selected, but no year, display the data for that scout.
          if (scout && !year) {
            this.displayScoutData(scout);
          } else {
            // If a year is selected, but no scout, display the data for that year.
            if (scout === "All" && year) {
              this.displayYearData(year);
            } else {
              // If a scout and a year are selected, display the data for that scout
              // and year.
              this.displayScoutYearData(scout, year);
            }
          }
        }
      };

      // By default, we display all the data.
      this.displayData();

      // Watch for changes to the scout and year inputs. When they change, call
      // the `displayData` function.
      d3.select("#scouts_selection").on("change", () => {
        const currentScout = d3.select("#scouts_selection").property("value");
        const slider = d3.select("#timeline");
        const currentYear = parseInt(slider.property("value"))
        this.displayData(currentScout, currentYear);
      });
      d3.select("#timeline").on("change", () => {
        const slider = d3.select("#timeline");
        const currentYear = parseInt(slider.property("value"))
        const currentScout = d3.select("#scouts_selection").property("value");
        this.displayData(currentScout, currentYear);
      });

      // Display the tooltip on click
      this.viz
        .selectAll("circle:not(.legend)")
        .on("mouseover", (d) => {
          if (d3.select("#scouts_selection").property("value") === "All") {
            console.log('all!')
            this.tooltipRenderAllData;
          } else if (d3.select("#scouts_selection").property("value") !== "All") {
            console.log('some!')
            this.tooltipRenderIndividualData;
          }
        })
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
      // this.viz
      //   .selectAll("circle:not(.legend)")
      //   .on("click", (e, d) => this.zoom(e, d))
      //   .style("stroke-width", 0.5);

      // Draw the legend.
      const legend = this.viz
        .append("g")
        .attr("fill", "#777")
        .attr(
          "transform",
          `translate(${this.width - this.maxRadius - 10},${this.height - 10})`
        )
        .attr("text-anchor", "middle")
        .style("font", "10px sans-serif")
        .selectAll("g")
        .data(this.radius.ticks(4).slice(1))
        .join("g")
        .classed("legend", true);

      legend
        .append("circle")
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("cy", (d) => -this.radius(d))
        .attr("r", this.radius)
        .classed("legend", true);

      legend
        .append("text")
        .attr("y", (d) => -2 * this.radius(d))
        .attr("dy", "1.3em")
        .text(this.radius.tickFormat(4, "s"));

      legend
        .append("text")
        .attr("y", -this.radius.range()[1])
        .attr("dy", "-0.7em")
        .text("Recordings");
      
      // TODO: If a user's filters return no data, display a message on the map.
      // This will be true for both scouts and years.

      // If the user presses the play button, advance the year slider by one year every second. This also
      // updates the map to display the points for the selected year.
      d3.select("#play-timeline").on("click", () => {
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
            // d3.select("#year-range").text(currentYear + 1);
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

      // When the year slider is changed, update the span#body__year-range to display the current year.
      d3.select("#timeline").on("input", () => {
        const slider = d3.select("#timeline");
        const currentYear = parseInt(slider.property("value"));
        d3.select("#body__year-range").text(currentYear);
      });

      // If the reset button is pressed, reset to the timeline-label, display all points, and reset the dropdown.
      this.resetButton.addEventListener("click", () => {
        d3.select("#body__year-range").text("1903-1926");
        document.getElementById("timeline").value = 1903;
        document.getElementById("scouts_selection").value = "All";
        this.displayData();
      });
    });
  }
}
