---
title: Scale-Invariant Manipulability Shape Tracking Across Heterogeneous Manipulators
image: images/research/robot_manipulation/manipulability_shape_tracking/main.png
tags:
  - Manipulability
  - Riemannian Geometry
  - Human-to-Robot Transfer
author: Geunwoo Kwon
member: geunwoo_kwon
---
**Goal**

The objective of this study is to transfer the shape of a manipulability ellipsoid, its orientation and semi-axis length ratios, between robots and from humans to robots of different sizes and kinematic structures, without matching its absolute scale.

***

**Summary**

A manipulability ellipsoid describes how well a robot can move or apply force in each task direction. Full-matrix tracking penalizes differences in both shape and absolute scale, so transferring an ellipsoid from one robot to a much larger or smaller one requires tuning a target scale even when only the shape matters.

This study proposes a scale-invariant shape-tracking method that treats manipulability matrices differing only by a positive scalar factor as equivalent and tracks their unit-determinant representatives. It derives the differential of the unit-determinant shape and an orthonormal coordinate representation of the tracking residual under the affine-invariant Riemannian metric, and shows that the full-matrix tracking cost splits exactly into this shape cost and a log-scale term. The objective is combined with end-effector position and direction tasks in a constrained joint-velocity quadratic program.

In kinematic simulations transferring the motion of a Franka Research 3 to Kinova Gen3, KUKA KR500 and UR20, the method reached endpoint shape distances of 9.30×10⁻⁵ on all three followers without scale tuning, while full-matrix tracking kept axis-ratio errors of 0.19–0.31 on KR500 and UR20 even with robot-specific scales. When transferring a recorded human reach to four robots, it reproduced the human's force shape with endpoint position errors of 2.4–5.6% of arm length, compared with up to 75% for full-matrix tracking.

***

{%
  include figure.html
  image="images/research/robot_manipulation/manipulability_shape_tracking/1.png"

%}

{%
  include figure.html
  image="images/research/robot_manipulation/manipulability_shape_tracking/2.png"

%}
