  (function () {
    var hourHand = document.getElementById('mini-clock-hour');
    var minHand  = document.getElementById('mini-clock-min');
    var secHand  = document.getElementById('mini-clock-sec');
    if (!hourHand || !minHand || !secHand) return;

    function updateMiniClock() {
      var now = new Date();
      var h = now.getHours() % 12;
      var m = now.getMinutes();
      var s = now.getSeconds();
      hourHand.style.transform = 'translateX(-50%) rotate(' + (h * 30 + m * 0.5) + 'deg)';
      minHand.style.transform  = 'translateX(-50%) rotate(' + (m * 6 + s * 0.1) + 'deg)';
      secHand.style.transform  = 'translateX(-50%) rotate(' + (s * 6) + 'deg)';
    }

    updateMiniClock();
    setInterval(updateMiniClock, 1000);
  })();
  
