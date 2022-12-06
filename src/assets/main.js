import HearingMap from "./map.js";
// import HearingChart from "./chart.js";

const urls = [
  "https://data.chnm.org/ne/northamerica/",
  "https://data.chnm.org/ne/southamerica/",
];
const promises = [];
urls.forEach((url) => promises.push(d3.json(url)));

Promise.all(promises)
  .then((data) => {
    setup(data);
  })
  .catch((e) => {
    console.error(
      `There has been a problem with your data: ${e.message}`
    );
  });

function setup(data) {
  const viz = new HearingMap(
    "#map",
    { northamerica: data[0], southamerica: data[1] },
    { width: 1000, height: 525 },
    { top: 10, right: 10, bottom: 10, left: 10 }
  );
  // const chart = new HearingChart(
  //   "#chart",
  //   { northamerica: data[0], southamerica: data[1] },
  //   { width: 1000, height: 525 },
  //   { top: 10, right: 10, bottom: 10, left: 10 }
  // )
  viz.render();
  viz.update();
  // chart.render();
  // chart.update();
}
