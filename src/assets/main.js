import HearingMap from "./map.js";
import dataPath from "/src/data/recordings.csv";

const urls = [
  "https://data.chnm.org/ne/northamerica/",
  "https://data.chnm.org/ne/southamerica/",
];
// const dataPath = "/src/data/recordings.csv";
const promises = [];
urls.forEach((url) => promises.push(d3.json(url)));
promises.push(dataPath);

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
    { northamerica: data[0], southamerica: data[1], dataset: data[2] },
    { width: 1000, height: 725 },
    { top: 10, right: 10, bottom: 10, left: 10 }
  );
  viz.render();
  viz.update();
}
