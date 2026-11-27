---
title: An Efficient Robot Control Framework Using the Model Context Protocol
image: images/research/robot_learning/mcp_robot_control/main.png
tags:
  - Robot Intelligence
  - Artificial Intelligence Application System
  - Model Context Protocol
  
author: Jungsoo Lee
member: jungsoo_lee
redirect_from:
  - /2025/01/03/research_jungsoo_lee_5.html
---
**Goal**

The objective of this study is to propose an efficient and generalizable robot control framework that transforms natural language commands into structured MCP messages, enabling clear, consistent, and scalable control across diverse robot platforms.

***

**Summary**

This study presents an efficient and generalizable robot control framework based on the Model Context Protocol (MCP), which leverages a large language model (LLM) to interpret user-issued natural language commands and convert them into structured MCP messages. These messages are then transformed into ROS instructions by the MCP server in real time, allowing the robot to execute context-aware and consistent behaviors while maintaining a clear separation from low-level control mechanisms.
To validate the effectiveness of the proposed framework, simulation experiments were conducted using the MOCA mobile manipulator in the NVIDIA Isaac Sim environment. The robot was tasked with navigating around obstacles and returning to its original position based on natural language commands. The system achieved a 93.33% success rate across 15 trials conducted by three different users, demonstrating high reliability, accuracy, and the potential for real-world application. This framework offers a scalable and adaptable solution for natural language-driven robot control across diverse platforms.

***

{% capture col1 %}
{%
  include figure.html
  image="images/research/robot_learning/mcp_robot_control/1.png"

%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/robot_learning/mcp_robot_control/2.png"

%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

{%
  include figure.html
  image="images/research/robot_learning/mcp_robot_control/3.png"

%}
