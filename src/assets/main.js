import HearingMap from "./map.js";
import dataPath from "/src/data/recordings.csv";

const urls = [
  "https://data.chnm.org/ne/globe?location=North+America&location=South+America",
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
    { geojson: data[0], dataset: data[1] },
    { width: 1000, height: 725 },
    { top: 10, right: 10, bottom: 10, left: 10 }
  );
  viz.render();
  viz.update();
}
