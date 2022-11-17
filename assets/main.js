import HearingMap from "./map.js";

const urls = ["https://data.chnm.org/ne/northamerica/"];
const promises = [];
urls.forEach((url) => promises.push(d3.json(url)));

Promise.all(promises)
  .then((data) => {
    setup(data);
  })
  .catch((e) => {
    console.error(
      `There has been a problem with your fetch operation: ${e.message}`
    );
  });

function setup(data) {
  const viz = new HearingMap(
    "#map",
    { northamerica: data[0], },
    { width: 1000, height: 525 },
    { top: 10, right: 10, bottom: 10, left: 10 }
  );
  viz.render();
}
