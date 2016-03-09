var Pushable = require('pull-pushable')
var Stats = require('statistics')
var pull = require('pull-stream')

exports.server = function (cb) {
  var count = 0, source = Pushable(), ts
  var rtt = Stats(), skew = Stats()
  return {
    source: source,
    sink: pull.drain(function (remote_ts) {
      if(++count%2) {
        ts = Date.now()
        source.push(ts)
      } else {
        var ts2 = Date.now()
        rtt.value(ts2 - ts)
        skew.value(remote_ts - ((ts + ts2)/2))
      }
    }, cb),
    rtt: rtt,
    skew: skew
  }
}

exports.client = function (interval, cb) {
  var source = Pushable(), ts = Date.now(), timeout
  var rtt = Stats(), skew = Stats()
  source.push(ts)
  function sched () {
    if(timeout) return
    timeout = setTimeout(function () {
      timeout = null
      source.push(ts = Date.now())
    }, interval)
  }
  return {
    source: source,
    sink: pull.drain(function (remote_ts) {
      var ts2 = Date.now()
      console.log(ts, ts2, ts2 - ts)
      rtt.value(ts2 - ts)
      skew.value(remote_ts - ((ts + ts2)/2))
      //echo the time again, so the server knows the skew here...
      sched()
      source.push(ts2)
    }, function (err) {
      clearInterval(timeout); cb && cb(err)
    }),
    rtt: rtt,
    skew: skew
  }
}

