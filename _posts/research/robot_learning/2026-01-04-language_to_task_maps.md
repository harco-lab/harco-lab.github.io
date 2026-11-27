---
title: "From Language to Task Maps: Compiling Semantic Relations While Preserving Task-Relevant Freedom"
image: images/research/robot_learning/language_to_task_maps/main.png
tags:
  - Language-Guided Manipulation
  - Conformal Geometric Algebra
  - RMPflow
author: Jaegyun Park
member: jaegyun_park
---
**Goal**

The objective of this study is to turn qualitative manipulation relations from natural-language instructions into continuous control objectives, while keeping the freedoms that each relation leaves unspecified instead of expanding it into a full target pose.

***

**Summary**

A language instruction such as "place the red cube on the yellow cube" states a relation between objects, but a controller needs task quantities, their derivatives and completion conditions. Expanding every relation into a complete pose constrains freedoms the task never specified and can make otherwise compatible objectives conflict.

This study introduces a Semantic Topology, a typed task graph of entities, relations and phases that a language model produces. Each relation type indexes a registered specification of which geometric distinctions it observes and which freedoms it preserves. A robot-side compiler grounds these specifications in the scene, builds relation-specific task maps and consistent derivatives with conformal geometric algebra, and composes the resulting policies through RMPflow.

When the language model only specified relations and left their geometry to the compiler, critical interface errors occurred in 19 of 60 instructions, compared with 58 of 60 when it also had to specify the geometry. Across 64 evaluations of eight relation forms, the task maps kept their preserved directions and matched the expected Jacobian ranks. In simulation with a Franka Emika Panda, fixing a coordinate that a relation leaves free increased the median terminal progress error by 20.24–71.00 mm, while the retained relations stayed within their bounds.

Jaegyun Park and Jingwang Lee contributed equally to this work.

***

{%
  include figure.html
  image="images/research/robot_learning/language_to_task_maps/1.png"
%}

{%
  include figure.html
  image="images/research/robot_learning/language_to_task_maps/2.png"
%}

{%
  include figure.html
  image="images/research/robot_learning/language_to_task_maps/3.png"
%}
