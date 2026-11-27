---
title: Spatial and Semantic Reasoning for LLM-Driven Robot Navigation via MCP
image: images/research/robot_learning/llm_navigation_mcp/main.jpg
tags:
  - Large Language Models
  - Robot Navigation
  - Model Context Protocol
author: Jungsoo Lee
member: jungsoo_lee
---
**Goal**

The objective of this study is to let large language models (LLMs) reason over ROS navigation data through reusable tools exposed via the Model Context Protocol (MCP), without modifying the existing ROS navigation stack.

***

**Summary**

LLMs are increasingly used as natural-language interfaces for robots, but ROS navigation data such as occupancy grids are raw numerical arrays that LLMs cannot easily use as spatial or semantic context, and adding LLM-driven capabilities often requires robot-specific wrappers.

This study proposes a non-invasive framework that places a navigation-oriented representation layer between the LLM and an unmodified ROS SLAM and navigation stack, exposed as standardized MCP tools that any MCP-compatible LLM can use. Visual map tools convert occupancy grids into metric, pose-aware map images, and semantic annotation tools record waypoint-level observations of landmarks and geometric features together with the robot pose.

The framework was evaluated in NVIDIA Isaac Sim with a Nova Carter robot running Cartographer and Nav2, using Claude Sonnet 4.6 and GPT-5.5 as LLM backends. In autonomous mapping, the two backends reached 97.83% and 99.78% map coverage. In spatial reasoning-based navigation ("Go to the smallest room."), they succeeded in 26 and 28 of 30 trials, and in semantic reasoning-based navigation ("Fire detected nearby. Navigate to the tool used for it."), both succeeded in all 30 trials.

Jungsoo Lee and Jaegyun Park contributed equally to this work.

***

{%
  include figure.html
  image="images/research/robot_learning/llm_navigation_mcp/1.png"

%}

{% capture col1 %}
{%
  include figure.html
  image="images/research/robot_learning/llm_navigation_mcp/main.jpg"

%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/robot_learning/llm_navigation_mcp/2.png"

%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

{%
  include figure.html
  image="images/research/robot_learning/llm_navigation_mcp/3.png"

%}
