---
title: Design of a Robotic Manipulation Information Model and Simulation for Indoor Digital Twin Construction
image: images/research/robot_manipulation/digital_twin_information_model/main.png
tags:
  - Digital Twin
  - Information Model
  - Robot System
author: Jungsoo Lee
member: jungsoo_lee
---
**Goal**

The objective of this study is to design a robotic manipulation information model and simulation process for building indoor digital twin environments, so that robots, grippers, conveyors and sensors can be modeled and controlled together in real time.

***

**Summary**

Digital twins reproduce physical systems in a virtual space for real-time monitoring and simulation, but indoor logistics lacks a standard way to model robots, equipment and their control together.

This study defines an information model that structures the components of a manipulation system, including the robot, suction gripper, conveyor and 3D vision sensors, together with their control flow. CAD assets are converted to the USD format so that structural and behavioral attributes can be represented and extended. ROS2 messaging is connected to the Action Graph of NVIDIA Isaac Sim for real-time data exchange, and trajectories planned with MoveIt 2 are sent through ROS2 topics and executed by the Articulation Controller, with the resulting joint states fed back to the planner.

The design was applied to a simulated postal logistics depalletizing task in NVIDIA Isaac Sim, showing that it provides a reusable and extensible basis for simulation-based development and evaluation of robotic manipulation systems.

***

{%
  include figure.html
  image="images/research/robot_manipulation/digital_twin_information_model/1.png"
%}

{%
  include figure.html
  image="images/research/robot_manipulation/digital_twin_information_model/2.png"
%}
