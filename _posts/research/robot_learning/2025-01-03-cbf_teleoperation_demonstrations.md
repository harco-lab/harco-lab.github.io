---
title: A Dual-Arm Robot Teleoperation Framework for High-Quality Demonstration Data Collection in Imitation Learning
image: images/research/robot_learning/cbf_teleoperation_demonstrations/main.jpg
tags:
  - Imitation Learning
  - Teleoperation
  - Control Barrier Functions
author: Jungsoo Lee
member: jungsoo_lee
---
**Goal**

The objective of this study is to collect high-quality demonstration data for imitation learning by keeping teleoperated motions safe and consistent, using a teleoperation framework based on Control Barrier Functions (CBF) for a dual-arm robot.

***

**Summary**

The performance of imitation learning depends heavily on the quality of its demonstrations, especially on action consistency, the degree to which a demonstrator acts consistently in similar states. During robot teleoperation, collisions and unstable joint motions make consistent demonstrations hard to collect, which degrades the learned policy.

This study proposes a CBF-based teleoperation framework that applies joint limits, collision avoidance and null-space motion as safety constraints in real time through a single quadratic program while keeping task priorities. The joint range is narrowed to [−π, π] so that the same end-effector pose is not recorded with different joint angles.

With a VR-teleoperated dual-arm robot, 50 box pick-and-place demonstrations were collected with a baseline framework and 50 with the proposed framework. The proposed framework lowered action variance by 27.21% (p = 0.012), shortened the average task time by 8.50% (from 18.62 s to 17.04 s) and removed all desk collisions (from 21 to 0), showing that it collects more consistent and safer demonstration data.

***

{%
  include figure.html
  image="images/research/robot_learning/cbf_teleoperation_demonstrations/1.png"

%}

{% capture col1 %}
{%
  include figure.html
  image="images/research/robot_learning/cbf_teleoperation_demonstrations/main.jpg"

%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/robot_learning/cbf_teleoperation_demonstrations/2.jpg"

%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}
