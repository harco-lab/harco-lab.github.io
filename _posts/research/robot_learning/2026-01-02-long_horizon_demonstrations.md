---
title: Generating Long-Horizon Manipulation Demonstrations from Teleoperation Data with RL-Based Grasp Refinement
image: images/research/robot_learning/long_horizon_demonstrations/main.png
tags:
  - Long-horizon Manipulation
  - Demonstration Generation
  - Reinforcement Learning
author: Jeongmok Kim
member: jeongmok_kim
---
**Goal**

The objective of this study is to generate long-horizon manipulation demonstrations in simulation for new object layouts that complete the whole task while keeping the motion characteristics of real teleoperation demonstrations.

***

**Summary**

Teleoperating a real robot through every object layout of a long-horizon task is costly. An imitation learning policy trained on teleoperation data can also fail to grasp when the layout changes or when contact differs between the real robot and simulation, and in a long-horizon task one failed grasp stops every following step.

This study combines a state-based ACT policy, trained on teleoperation demonstrations replayed in NVIDIA Isaac Sim, with reinforcement learning-based grasp refinement built on DemoGrasp. The imitation policy performs the sequential manipulation, and when the palm comes within 0.30 m of the target object, a single-step PPO policy corrects the reference grasp trajectory taken from the demonstrations by adjusting the wrist path and finger joint targets. Episodes that complete the full task are saved as new demonstrations.

On a dual-arm robot with two 7-DoF Kinova Gen3 arms and two 16-DoF Allegro hands, full-task success over 30 random layouts rose from 36.7% to 80.0% for can sorting and from 40.0% to 60.0% for book shelving compared with imitation learning alone. Relative to the variation between teleoperation demonstrations, the generated trajectories added mean arm-joint RMSEs of only 1.5° and 1.7°, while the finger joints added 4.8° and 7.6°, so the arm motions in particular retain the character of teleoperation.

***

{%
  include figure.html
  image="images/research/robot_learning/long_horizon_demonstrations/1.jpg"

%}

{% capture col1 %}
{%
  include figure.html
  image="images/research/robot_learning/long_horizon_demonstrations/2.png"

%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/robot_learning/long_horizon_demonstrations/3.png"

%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}
