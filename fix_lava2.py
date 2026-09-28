import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

pulse_old = r"""      // Organic multi-frequency lava pulse
      const pulse = 0\.76 \+ Math\.sin\(ts \* 0\.0031\) \* 0\.13 \+ Math\.sin\(ts \* 0\.0079 \+ 1\.4\) \* 0\.07 \+ Math\.sin\(ts \* 0\.0017 \+ 2\.9\) \* 0\.04;
      lavaLight\.intensity = lavaBase \* pulse;"""

pulse_new = r"""      // Organic multi-frequency lava pulse
      const pulse = 0.76 + Math.sin(ts * 0.0031) * 0.13 + Math.sin(ts * 0.0079 + 1.4) * 0.07 + Math.sin(ts * 0.0017 + 2.9) * 0.04;
      
      // Calculate sun brightness based on time of day for night boost
      let currentHour = 12;
      const ev = ERUPTIONS.find(e => e.id === activeEruption);
      if (ev && ev.timeOfDay !== undefined) currentHour = (ev.timeOfDay + state.timeline * ev.duration) % 24;
      const sunAngle = ((currentHour - 12) / 24) * Math.PI * 2;
      const sunH = Math.cos(sunAngle);
      const sunBrightness = clamp(sunH * 2.5 + 0.2, 0.0, 1.0);
      
      const nightBoost = 1.0 + (1.0 - sunBrightness) * 4.0; // Glows 5x as bright relative to dark scene at night
      lavaLight.intensity = lavaBase * pulse * nightBoost;"""

content = re.sub(pulse_old, pulse_new, content)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
