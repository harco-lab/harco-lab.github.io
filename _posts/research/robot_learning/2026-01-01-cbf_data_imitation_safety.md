---
title: Effect of CBF-based Teleoperation Data Collection on the Safety of Imitation Learning Policies
image: images/research/robot_learning/cbf_data_imitation_safety/main.png
tags:
  - Imitation Learning
  - Control Barrier Functions
  - Safety
author: Sooin Choi
member: sooin_choi
---
**Goal**

The objective of this study is to examine whether the safety that a Control Barrier Function (CBF)-based teleoperation controller provides during data collection carries over to an imitation learning policy trained on that data and executed without the safety filter.

***

**Summary**

CBF-based teleoperation prevents collisions while demonstrations are collected, but it was unclear whether policies learned from those demonstrations inherit this safety. On a dual-arm robot with Allegro hands, 50 box pick-and-place demonstrations were collected with the CBF and 50 without it, an ACT policy was trained on each dataset with identical settings, and both policies were run on the real robot without the CBF.

Both policies succeeded in all 10 trials, but the policy trained on the data without the CBF collided with the desk in 8 of 10 trials (p = 7.1×10⁻⁴), while the policy trained on the CBF data never did. Near the desk, the CBF-data policy approached along the CBF constraint boundary, as its demonstrations did, and its descent-speed variability across trials was 44% lower (0.46 cm/s versus 0.83 cm/s).

These results show that task success alone does not reveal this safety difference, and suggest that the safe behavior induced by the CBF during data collection is reflected in the learned policy.

***

{% capture col1 %}
{%
  include figure.html
  image="images/research/robot_learning/cbf_data_imitation_safety/1.png"

%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/robot_learning/cbf_data_imitation_safety/2.png"

%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}
