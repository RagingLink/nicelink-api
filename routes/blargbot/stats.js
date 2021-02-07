const express = require('express');
const router = express.Router();
const bent = require("bent");
const getString = bent("string");
var stats = {};
const prom2json = require("parse-prometheus-text-format")

var updateStats = async () => {
  try {
    let excludedMetrics = [
      "process_cpu_user_seconds_total",
      "process_cpu_system_seconds_total",
      "process_cpu_seconds_total",
      "process_resident_memory_bytes",
      "process_virtual_memory_bytes",
      "process_heap_bytes",
      "process_open_fds",
      "process_max_fds",
      "nodejs_eventloop_lag_seconds",
      "nodejs_active_handles_total",
      "nodejs_active_requests_total",
      "nodejs_heap_size_total_bytes",
      "nodejs_heap_size_used_bytes",
      "nodejs_external_memory_bytes",
      "nodejs_heap_space_size_total_bytes",
      "nodejs_heap_space_size_used_bytes",
      "nodejs_heap_space_size_available_bytes",
      "bot_subtag_latency_ms" //This one should be included in some way, though I'm not sure how rn
    ]
    let metrics = await getString("https://blargbot.xyz/metrics");
    var metricsArray = prom2json(metrics);
    metricsArray = metricsArray.filter(i => !(excludedMetrics.includes(i.name)));
    //Replace JSON with key : value instead of an array
    var metricsJSON = metricsArray.reduce((obj, metric) => (obj[metric.name] = metric, obj) ,{});
    console.info(Object.keys(metricsJSON));
  } catch (e) {}
}
router.get("/stats", async (req, res, next) => {

  res.type("json");
})

updateStats();

module.exports = router;