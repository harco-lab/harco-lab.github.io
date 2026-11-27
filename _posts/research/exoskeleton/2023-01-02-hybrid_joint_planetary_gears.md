---
title: Active Passive Hybrid Joint System Using Planetary Gears
image: images/research/exoskeleton/hybrid_joint_planetary_gears/main.png
tags:
  - Lower-limb Exoskeleton robot
  - H / W Modeling
author: Joonhyung Kong
redirect_from:
  - /2023/01/02/research_joonhyung_kong_1.html
---
**Goal**

This study is an algorithm that makes it easy to switch between active or passive gear mode changes through hardware design that combines planetary gear and gear break.

This will reduce the power consumption of exoskeleton robots by adjusting the control algorithm according to human behavior patterns.

***

**Summary**

The exoskeleton suit, which can produce great power, uses a lot of power at all times, so the drive time is short or large.

This study attempted to reduce power consumption by adding passive driving to sections that do not require much power in the sequence of human movement.

The active/passive mode of the gearbox changes depending on the motor restraint, which reduces power consumption and increases battery running time.

***

**Topic**
 * Lower-limb Exoskeleton robot
 * Planetary Gear H/W
 * Gear Shift

***

{% capture col1 %}
{%
  include figure.html
  image="images/research/exoskeleton/hybrid_joint_planetary_gears/main.png"
  caption="Planetary Gear + Gear Break System"
%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/exoskeleton/hybrid_joint_planetary_gears/1.png"
  caption="Planetary Gear Interior View"
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}
