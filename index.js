var Pushable = require('pull-pushable')
var Stats = require('statistics')
var pull = require('pull-stream')

module.exports = function (opts) {
  var timeout = opts && opts.timeout || 5*60*1000 //default: 5 minutes
  var serve = false, timer
  var source = Pushable()
  var rtt = Stats(), skew = Stats()

  function ping () {
    //serve the ping pong, opponent
    //will volley it back to us, keeping connection alive
    //and revealing clock skew.
    serve = true
    source.push(ts = Date.now())
  }

  //we send the first ping
  if(opts && opts.serve) ping()

  return {
    source: source,
    sink: pull.drain(function (remote_ts) {
      if(serve) {
        var ts2 = Date.now()
        rtt.value(ts2 - ts)
        //if their time is behind half a round trip behing ts2
        //consider that to be negative skew.
        skew.value(remote_ts - ((ts2 + ts)/2))
        serve = false
      }
      else {
        //volley timestamp back to opponent.
        source.push(ts = Date.now())
        //we'll serve next time.
        timer = setTimeout(ping, timeout)
      }
    }, function (err) {
      clearTimeout(timer)
    }),
    rtt: rtt, skew: skew
  }

}
