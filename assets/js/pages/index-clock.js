  (function () {
    var hourHand = document.getElementById('mini-clock-hour');
    var minHand  = document.getElementById('mini-clock-min');
    var secHand  = document.getElementById('mini-clock-sec');
    var time = document.getElementById('timer-local-time');
    if (!hourHand || !minHand || !secHand || !time) return;
    var timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

    function updateMiniClock() {
      var now = new Date();
      var h = now.getHours() % 12;
      var m = now.getMinutes();
      var s = now.getSeconds();
      hourHand.style.transform = 'translateX(-50%) rotate(' + (h * 30 + m * 0.5) + 'deg)';
      minHand.style.transform  = 'translateX(-50%) rotate(' + (m * 6 + s * 0.1) + 'deg)';
      secHand.style.transform  = 'translateX(-50%) rotate(' + (s * 6) + 'deg)';
      var dateTime = String(now.getHours()).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      if (time.dateTime !== dateTime) {
        time.dateTime = dateTime;
        time.textContent = timeFormat.format(now);
      }
    }

    updateMiniClock();
    setInterval(updateMiniClock, 1000);
  })();
  
