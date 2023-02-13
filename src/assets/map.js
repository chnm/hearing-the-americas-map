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

    // The renderMetadata function is called when the user clicks on a point
    // and updates the righthand metadata panel. It takes the data from the
    // point that was clicked and uses it to update the metadata panel.
    this.renderMetadata = (e, d) => {
      const parseDate = d3.timeFormat("%b %d, %Y");
      const location = `${d.city}, ${d.country}`;
      const cityName = d.city;

      // Metadata includes the following fields:
      // - Dates of visit (only for the recordings array)
      // - List of years when recordings were made (only for the totalcities array)
      // - Number of recordings
      // - Scouts who visited the location
      // - Music clips (recordings array for individual cities; the entire list for a city in totalcities)

      const displayStartEndDates = `${parseDate(
        new Date(d.start_date)
      )} to ${parseDate(new Date(d.end_date))}`;
      const displayYears = d.years
        ? d.years
            .map((year) => {
              return `<li> ${year}`;
            })
            .join("")
        : null;
      const displayRecordings = d.recordings;
      // display the scouts list 
      const displayScouts = d.scouts_list
        ? d.scouts_list
            .map((scout) => {
              return `<li> ${scout}`;
            })
            .join("")
        : null;

      // Show the city and country
      d3.select(".metadata__title").html(location);

      // Display the number of recordings, if the data is not empty
      d3.select(".metadata__recordings")
        .style("display", displayRecordings ? "block" : "none")
        .html(`<strong>Number of recordings:</strong> ${displayRecordings}`);

      // If recordings are 0, display "unknown"
      if (displayRecordings === 0) {
        d3.select(".metadata__recordings")
          .style("display", "block")
          .html(`<strong>Number of recordings:</strong> Unknown`);
      }

      // Displaying the date information depends on whether the
      // totalcities array or the recordings array is being used.
      // We determine which array is active by checking if there are values
      // in d.start_date, which are absent in totalcities. If not, we display the
      // list of years. Otherwise, the date range.
      if (d.start_date) {
        d3.select(".metadata__years").style("display", "none");
        d3.select(".metadata__dates")
          .style("display", "block")
          .html(`<strong>Dates of visit:</strong> ${displayStartEndDates}`);
      } else {
        d3.select(".metadata__years")
          .style("display", "block")
          .html(
            `<strong>Years that scouts visited ${cityName}:</strong> <ul>${displayYears}</ul>`
          );
        d3.select(".metadata__dates").style("display", "none");
      }

      // Display the scouts, if the data is not empty
      d3.select(".metadata__scouts")
        .style("display", displayScouts ? "block" : "none")
        .html(`<strong>Scouts that visited ${cityName}:</strong> <ul>${displayScouts}</ul>`);

      // This function creates the audio player and embeds it in the metadata panel.
      // If d.omeka is not empty, it will create the player.
      const displayAudioPlayer = (d) => {
        // If there is a URL to the audio clip, we create the audio player
        if (!d.omeka) {
          d3.select(".metadata__audio").style("display", "none");
        } else {
          d3.select(".metadata__audio").style("display", "block")
          .html(`<h3>Sample recordings</h3><br/>
              <audio controls><source src="${d.recordings_url}" type="audio/mpeg"></audio><br/>
              ${d.omeka_creator}, "<a href="${d.omeka_item_url}">${d.omeka_title}</a>" (${d.omeka_item_year}).`);
        }
      };

      // This function removes the audio player from the metadata panel.
      const removeAudioPlayer = () => {
        d3.select(".metadata__audio").style("display", "none");
      };

      // We call both functions to first remove an existing audio player, then
      // create a new one if the data is available.
      removeAudioPlayer();
      displayAudioPlayer(d);

      // When the map is displaying allData, we want to show the list of available clips
      // for a city in the metadata pane. The array of clips are in the omeka object.
      if (!d.omeka) {
        d3.select(".metadata__audio").style("display", "none");
      } else {
        d3.select(".metadata__audio").style("display", "block")
        .html(`<h3>Sample recordings</h3><br/>
            ${d.omeka
              .map((clip) => {
                return `
                <audio controls><source src="${clip.recordings_url}" type="audio/mpeg"></audio><br/>
                ${clip.creator}, "<a href="${clip.item_url}">${clip.title}</a>" (${clip.item_year}).<br/><br/>`;
              })
              .join("")}`);
      }
    };

    this.resetMetadata = () => {
      d3.select(".metadata__title").html("");
      d3.select(".metadata__recordings").html("");
      d3.select(".metadata__years").html("");
      d3.select(".metadata__scouts").html("");
      d3.select(".metadata__dates").html("");
      d3.select(".metadata__audio").html("");
    };

    // Tooltip only displays the city and country on mouseover.
    this.tooltipRender = (e, d) => {
      const text = `<strong>${d.city}, ${d.country}</strong> 
        ${d.omeka.length ? " <span style='font-size: 18px;'>𝇇</span> " : ""}
        ${
          d.omeka.recordings_url
            ? " <span style='font-size: 18px;'>𝇇</span> "
            : ""
        }
        <p class="tooltip__text">Click on a point to see how many recordings were made in <br/>
        each city and when. If you see this symbol (𝇇) next <br/>
        to the city name above, there are recordings
        available <br/> for listening. Double-click to return to
        the totals for<br/> Latin America as a whole.</p>`;
      this.tooltip.html(text);
      this.tooltip.style("visibility", "visible");
    };
  }

  render() {
    this.viz
      .append("path")
      .datum(this.data.geojson)
      .attr("d", this.path)
      .attr("fill", "#F0F0F4")
      .attr("stroke", "transparent")
      .attr("stroke-width", 0.5);

    // Draw the map features
    this.viz
      .selectAll("path")
      .data(this.data.geojson.features)
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
    // Since we already parsed the CSV file, we can use it directly
    const data = this.data.dataset;

      this.radius = d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d) => d.recordings)])
        .range([0, this.maxRadius]);

      // Create a new array of objects
      const recordings = data.map((d) => {
        return {
          start_date: d.start_date ? d.start_date : d.year,
          end_date: d.end_date ? d.end_date : d.year,
          country: d.country,
          city: d.city,
          lat: +d.lat,
          lon: +d.lon,
          // Scouts need to be separated from their delimiter (;) and loop through every 
          // scout to create an array of objects.
          scouts: d.scouts.split(";").map((s) => {
            return {
              name: s,
            };
          }),
          recordings: +d.recordings,
          recordings_url: d.recordings_url,
          omeka_title: d.omeka_title,
          omeka_creator: d.omeka_creator,
          omeka_item_url: d.omeka_item_url,
          omeka_item_year: d.omeka_item_year,
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
          }
        });
      });

      // We will add a year array to each of the rows by city, using either the start_date or end_date. If start_date is
      // empty, we use the d.year value. If end_date is empty, we use the d.year value. These values
      // allow us to filter by a start and end year.
      recordings.forEach((recording) => {
        const yearRange = [];
        // add the yearRange as a years array to the recording object
        recording.years = yearRange;
        // if the recording has a start_date for a particular city [key], we add the range of
        // years to the yearRange array
        if (recording.start_date) {
          for (
            let i = recording.start_date.substring(0, 4);
            i <= recording.end_date.substring(0, 4);
            i++
          ) {
            yearRange.push(+i);
          }
        } else {
          // if the recording does not have a start_date, we add the year to the yearRange array
          recording.years = recording.year;
        }
      });

      // We add the omeka_title, omeka_creator, omeka_item_url, and recordings_url to the
      // recordings object in an omeka property. If there is no data,
      // we return an empty omeka array.
      recordings.forEach((recording) => {
        if (recording.omeka_title) {
          recording.omeka = [
            {
              title: recording.omeka_title,
              creator: recording.omeka_creator,
              item_url: recording.omeka_item_url,
              recordings_url: recording.recordings_url,
              item_year: recording.omeka_item_year,
            },
          ];
        } else {
          recording.omeka = [];
        }
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
            country: recording.country,
            years: recording.years,
            scouts: recording.scouts,
          };
        }
      });

      // We add the Omeka title, creator, item_url, and recordings_url to the
      // recordingsPerCity object.
      recordings.forEach((recording) => {
        const key = `${recording.city.trim()}`;
        if (recordingsPerCity[key]) {
          if (recordingsPerCity[key].omeka) {
            if (
              recording.omeka_title &&
              recording.omeka_creator &&
              recording.omeka_item_url
            ) {
              recordingsPerCity[key].omeka.push({
                title: recording.omeka_title,
                creator: recording.omeka_creator,
                item_url: recording.omeka_item_url,
                recordings_url: recording.recordings_url,
                item_year: recording.omeka_item_year,
              });
            }
          } else {
            recordingsPerCity[key].omeka = [];
            if (
              recording.omeka_title &&
              recording.omeka_creator &&
              recording.omeka_item_url
            ) {
              recordingsPerCity[key].omeka.push({
                title: recording.omeka_title,
                creator: recording.omeka_creator,
                item_url: recording.omeka_item_url,
                recordings_url: recording.recordings_url,
                item_year: recording.omeka_item_year,
              });
            }
          }
        }
      });

      // We determine the scouts of each recording per city, which we will
      // push to recordingsPerCity. We need to find the entire list of scouts that visited
      // each city. We only return an array of scout names for each city. We will 
      // record this data in a scouts_list array. We only care about their name.
      recordings.forEach((recording) => {
        const key = `${recording.city.trim()}`;
        if (recordingsPerCity[key]) {
          if (recordingsPerCity[key].scouts_list) {
            recording.scouts.forEach((scout) => {
              if (!recordingsPerCity[key].scouts_list.includes(scout.name)) {
                recordingsPerCity[key].scouts_list.push(scout.name);
              }
            });
          } else {
            recordingsPerCity[key].scouts_list = [];
            recording.scouts.forEach((scout) => {
              if (!recordingsPerCity[key].scouts_list.includes(scout.name)) {
                recordingsPerCity[key].scouts_list.push(scout.name);
              }
            });
          }
        }
      });

      // Strip white space from scouts_list, sort alphabetically, and return unique
      // values.
      Object.keys(recordingsPerCity).forEach((key) => {
        recordingsPerCity[key].scouts_list = recordingsPerCity[
          key
        ].scouts_list
          .map((scout) => scout.trim())
          .sort()
          .filter((scout, index, self) => self.indexOf(scout) === index);
      });

      // We need to determine the years of each recording per city, which we will
      // push to recordingsPerCity. We need to find the earliest start date and the
      // latest end date for each city. We will use this to determine the range of
      // years for each city. We will parse the yyyy-mm-dd format to yyyy.
      // If there is no start_date, we default to the d.year value.
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
      let totaldata = [];
      totaldata.push({ totalcities: Object.entries(recordingsPerCity) });
      totaldata.push({ recordings: recordings });

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
            years: d[1].years,
            scouts: d[1],
            scouts_list: d[1].scouts_list,
            omeka: d[1].omeka,
          };
        });

        // We then display the data.
        this.viz
          .selectAll("circle:not(.legend)")
          .data(allData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          .attr("r", (d) => this.radius(d.recordings))
          .attr("class", "point");

        // We reattach the tooltip.
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

        // When a user clicks on a point, we will update the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("click", this.renderMetadata);

        // When the point is clicked a second time, we reset the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("dblclick", this.resetMetadata);
      };

      // The function to display the data for a scout.
      this.displayScoutData = (scout) => {
        // We filter the data for the selected scout.
        const scoutData = totaldata[1].recordings.filter((d) => {
          return d.scouts.some((s) => s.name.trim() === scout);
        });

        // We then display the data.
        this.viz
          .selectAll("circle:not(.legend)")
          .data(scoutData)
          .join("circle")
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
          .attr("class", "point")
          .sort((a, b) => b.recordings - a.recordings);

        // We reattach the tooltip.
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

        // When a user clicks on a point, update the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("click", () => {
            this.renderMetadata();
            d3.select("#time_span_note").style("visibility", "hidden");
          });

        // When the point is clicked a second time, we reset the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("dblclick", this.resetMetadata);
      };

      // The function to display the data for a year.
      this.displayYearData = (year) => {
        // We filter the data for the selected year.
        const yearData = totaldata[1].recordings.filter((d) => {
          // we filter the data by d.years array to see if the year(s) are included.
          return d.years.some((y) => y === year);
        });
        // We then display the data.
        this.viz
          .selectAll("circle:not(.legend)")
          .data(yearData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          // if recordings are 0, the radius is set to 5.
          .attr("r", (d) => {
            if (d.recordings === 0) {
              return 5;
            } else {
              return this.radius(d.recordings);
            }
          })
          .attr("class", "point");

        // We reattach the tooltip.
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

        // When a user clicks on a point, we will update the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("click", this.renderMetadata);

        // When the point is clicked a second time, we reset the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("dblclick", this.resetMetadata);
      };

      // The function to display the data for a scout and a year.
      this.displayScoutYearData = (scout, year) => {
        // We filter the data for the selected scout and year.
        const scoutYearData = totaldata[1].recordings.filter((d) => {
          return (
            d.scouts.some((s) => s.name.trim() === scout) &&
            d.years.some((y) => y === year)
          );
        });

        // We then display the data.
        this.viz
          .selectAll("circle:not(.legend)")
          .data(scoutYearData)
          .join("circle")
          .attr("cx", (d) => this.projection([d.lon, d.lat])[0])
          .attr("cy", (d) => this.projection([d.lon, d.lat])[1])
          .attr("r", (d) => this.radius(d.recordings))
          .attr("class", "point")
          .sort((a, b) => b.recordings - a.recordings);

        // We reattach the tooltip.
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

        // When a user clicks on a point, we will update the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("click", this.renderMetadata);

        // When the point is clicked a second time, we reset the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("dblclick", this.resetMetadata);
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
              // if the year is 1902 and a scout is selected, display the data for that scout.
              if (year === 1902 && scout) {
                this.displayScoutData(scout);
              }
              // If a scout and a year are selected, display the data for that scout
              // and year.
              else this.displayScoutYearData(scout, year);
            }
          }
        }

        // We reattach the tooltip.
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

        // When a user clicks on a point, we will update the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("click", this.renderMetadata);

        // When the point is clicked a second time, we reset the metadata pane.
        this.viz
          .selectAll("circle:not(.legend)")
          .on("dblclick", this.resetMetadata);
      };

      // By default, we display all the data.
      this.displayData();

      // Watch for changes to the scout and year inputs. When they change, call
      // the `displayData` function.
      d3.select("#scouts_selection").on("change", () => {
        const currentScout = d3.select("#scouts_selection").property("value");
        const slider = d3.select("#timeline");
        const currentYear = parseInt(slider.property("value"));
        this.displayData(currentScout, currentYear);
        this.resetMetadata();
      });
      d3.select("#timeline").on("change", () => {
        const slider = d3.select("#timeline");
        const currentYear = parseInt(slider.property("value"));
        const currentScout = d3.select("#scouts_selection").property("value");
        this.displayData(currentScout, currentYear);
        this.resetMetadata();
      });

      // Draw the legend.
      const legend = this.viz
        .append("g")
        .attr(
          "transform",
          `translate(${this.width - this.maxRadius - 80},${this.height - 10})`
        )
        .attr("text-anchor", "middle")
        .style("font", "10px sans-serif")
        .style("fill", "#264653")
        .selectAll("g")
        .data([0, 200, 500, 1000, 1500, 2000, 2500].slice(1))
        .join("g")
        .classed("legend", true);

      legend
        .append("circle")
        .attr("fill", "none")
        .attr("stroke", "#264653")
        .attr("cy", (d) => -this.radius(d))
        .attr("r", this.radius)
        .classed("legend", true);

      legend
        .append("text")
        .attr("y", (d) => -2 * this.radius(d))
        .attr("dy", "1em")
        .text(this.radius.tickFormat(4, "s"));

      legend
        .append("text")
        .attr("y", -this.radius.range()[1])
        .attr("dy", "2em")
        .text("Number of recordings");

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
            d3.select("#body__year-range").text(currentYear + 1);
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
        d3.select("#body__year-range").text("1902-1926");
        document.getElementById("timeline").value = 1902;
        document.getElementById("scouts_selection").value = "All";
        this.resetMetadata();
        this.displayData();
      });
  }
}
