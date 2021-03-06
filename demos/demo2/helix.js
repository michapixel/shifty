/*global window:true, setTimeout:true */
(function (global) {
  var CYCLE_SPEED = 1500
    ,HELIX_WIDTH = 300
    ,SEGMENT_BUFFER = 0.2
    ,startTime
    ,pausedAtTime
    ,segmentContainer
    ,segments
    ,stepStateLists
    ,updateHandle
    ,isPlaying
    ,i;
  
  function now () {
    return +(new Date());
  }
  
  function getPosition (loopPosition, startBuffer) {
    var moddedLoopPosition
      ,interpolator
      ,interpolatedValue;
    
    if ((loopPosition - startBuffer) < 0) {
      return 0;
    }
    
    interpolator = moddedLoopPosition = ((loopPosition - startBuffer) % 2);
    
    if (moddedLoopPosition > 1) {
      interpolator = moddedLoopPosition - 1;
    } 
    
    interpolatedValue = global.Tweenable.util.interpolate({
        from: {
          'left': 0
          ,'color': '#f00'
        },
        to: {
          'left': HELIX_WIDTH 
          ,'color': '#00f'
        },
        position: interpolator,
        easing: 'easeInOutSine'
    });
    
    if (moddedLoopPosition > 1) {
      return {
        'left': HELIX_WIDTH - interpolatedValue.left
        ,'color': interpolatedValue.color
      }
    } else {
      return interpolatedValue;
    }
  }
  
  function updateSegment (index, loopPosition) {
    var segment
      ,calculated;
    
    segment = segments[index];
    calculated = getPosition(loopPosition, index * SEGMENT_BUFFER);
    segment.style.left = calculated.left + 'px';
    //segment.style.background = calculated.color;
  }
  
  function updateSegments (startTime, callback) {
    var i
      ,timeDelta
      ,normalizedTime;
    
    timeDelta = now() - startTime;
    normalizedTime = timeDelta / CYCLE_SPEED;
    
    for (i = 0; i < segments.length; i++) {
      updateSegment(i, normalizedTime);
    }
    
    callback();
  }
  
  function loop () {
    updateHandle = setTimeout(function () {
      updateSegments(startTime, loop);
    }, 1000 / 60);
  }
  
  function pause () {
    if (isPlaying === false) {
      return;
    }
    
    isPlaying = false;
    pausedAtTime = Tweenable.util.now();
    clearTimeout(updateHandle);
  }
  
  function play () {
    if (isPlaying === true) {
      return;
    }
    
    isPlaying = true;
    startTime = Tweenable.util.now() - (pausedAtTime - startTime);
    loop();
  }

  function init (containerId) {
    pausedAtTime = startTime = Tweenable.util.now();
    segmentContainer = document.getElementById(containerId);
    segments = segmentContainer.children;
    stepStateLists = [];
    
    for (i = 0; i < segments.length; i++) {
      stepStateLists.push([])
    }
    
    window.pause = pause;
    window.play = play;
  }

  global.shiftyDemo = global.shiftyDemo || {};

  Tweenable.util.simpleCopy(global.shiftyDemo, {
            'helixInit': init
            ,'helixPlay': play
            ,'helixPause': pause
        });
} (this));
