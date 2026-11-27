---
title: Executor-aware Candidate Selection via a Feasibility Certificate
image: images/research/robot_manipulation/executor_feasibility_certificate/main.png
tags:
  - Motion Planning
  - Hierarchical Control
  - Feasibility Certificate
author: Sooin Choi
member: sooin_choi
---
**Goal**

The objective of this study is to make a motion planner choose only candidates for which a downstream hierarchical executor can actually issue a command, without changing how candidates are generated or ranked, or how the executor works.

***

**Summary**

In modular robot systems, a motion planner proposes candidate motions and a separate hierarchical executor computes the final command under state-dependent hard constraints such as workspace, obstacle and interaction limits. A candidate that is geometrically valid can still leave the executor with no feasible command.

This study proposes a certificate that constructs a command from the executor's hard constraints at each predicted rollout state and verifies it against the original constraints. A candidate is admitted only if every checked state is certified, so certification is a sufficient condition for executor feasibility.

Across 5,085 geometry-valid numerical evaluations on Franka Panda and RB-Y1 models, 795 admitted no executor-feasible command, and none of them was certified, while 7.09% of feasible cases stayed uncertified. A single check took a median of 140–158 µs in the tested implementation. In MuJoCo interaction simulations with FR3 and RB-Y1, certificate-based admission changed the selected candidate in 36–46% of events and lowered the planner–executor command gap during interaction by 16–25%, at the cost of lower planner-command coverage and higher tracking error.

***

{% capture col1 %}
{%
  include figure.html
  image="images/research/robot_manipulation/executor_feasibility_certificate/1.png"

%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/robot_manipulation/executor_feasibility_certificate/2.png"

%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}
